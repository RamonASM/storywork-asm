import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/server'
import { generateContent, parseJsonResponse } from '@/lib/ai/client'
import { AI_PRESETS } from '@/lib/ai/config'
import { generateStoryContentPrompt } from '@/lib/storywork/prompts'
import { spendCredits, getOrCreateUser } from '@/lib/credits/service'
import { CREDIT_COSTS } from '@/lib/credits/config'
import { storyGenerateSchema, createValidationError } from '@/lib/validations/storywork'
import { checkRateLimit, RateLimits, rateLimitHeaders } from '@/lib/rate-limit/limiter'
import { getVoiceProfile, generateVoicePromptAdditions } from '@/lib/voice/profile-service'
import { humanizeCarouselSlides } from '@/lib/voice/humanizer'
import { DEFAULT_VOICE_PROFILE } from '@/lib/voice/types'
import { validateCarouselQuality } from '@/lib/carousel/quality-checker'

export const dynamic = 'force-dynamic'
export const maxDuration = 120 // Allow up to 2 minutes for AI generation

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check rate limit before expensive operations
    const rateLimit = await checkRateLimit(`generate:${userId}`, RateLimits.storyGeneration)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before generating another story.' },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      )
    }

    const user = await currentUser()
    const email = user?.emailAddresses?.[0]?.emailAddress

    if (!email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 400 })
    }

    // Parse and validate request body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const validation = storyGenerateSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(createValidationError(validation.error), { status: 400 })
    }

    const { storyId, storyType, answers } = validation.data

    // Get or create storywork user
    const storyworkUser = await getOrCreateUser(userId, email)

    // Spend credits
    const creditResult = await spendCredits(
      storyworkUser.id,
      CREDIT_COSTS.storyGeneration,
      'storywork_carousel',
      `Story generation: ${storyId}`
    )

    if (!creditResult.success) {
      return NextResponse.json(
        { error: creditResult.error || 'Insufficient credits', balance: creditResult.newBalance },
        { status: 402 }
      )
    }

    // Get user's voice profile (if any)
    let voiceProfile = await getVoiceProfile(storyworkUser.id)
    if (!voiceProfile) {
      // Use defaults if no profile exists
      voiceProfile = {
        id: '',
        userId: storyworkUser.id,
        createdAt: new Date().toISOString(),
        ...DEFAULT_VOICE_PROFILE,
      }
    }

    // Generate voice-aware prompt
    const agentName = user?.firstName || 'Agent'
    let prompt = generateStoryContentPrompt(storyType, answers, agentName)

    if (!prompt) {
      return NextResponse.json({ error: 'Invalid story type' }, { status: 400 })
    }

    // Add voice profile guidance to the prompt
    const voiceAdditions = generateVoicePromptAdditions(voiceProfile)
    if (voiceAdditions) {
      prompt = `${prompt}\n\n${voiceAdditions}`
    }

    const response = await generateContent(prompt, AI_PRESETS.storyGeneration)

    const rawContent = parseJsonResponse<{
      slides: Array<{
        headline: string
        body: string
        visual_suggestion: string
      }>
      hashtags: string[]
      caption: string
    }>(response)

    if (!rawContent) {
      return NextResponse.json({ error: 'Failed to generate content' }, { status: 500 })
    }

    // Apply humanizer to remove AI-tells and apply voice characteristics
    const humanizedSlides = humanizeCarouselSlides(rawContent.slides, voiceProfile)

    const generatedContent = {
      ...rawContent,
      slides: humanizedSlides,
      voice_profile_applied: true,
    }

    // Update story with generated content
    const supabase = createAdminClient()

    const { error: updateError } = await supabase
      .from('storywork_stories')
      .update({
        generated_content: generatedContent,
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', storyId)
      .eq('user_id', storyworkUser.id)

    if (updateError) {
      console.error('Failed to update story:', updateError)
      return NextResponse.json({ error: 'Failed to save generated content' }, { status: 500 })
    }

    // Quality check with partial brand info (full check happens client-side)
    const partialBrandKit = {
      id: '',
      name: agentName,
      primary_color: '#000000',
      secondary_color: '#ffffff',
      font_family: 'Inter',
      logo_url: null,
      headshot_url: null,
    }
    const qualityReport = validateCarouselQuality(humanizedSlides, partialBrandKit)

    return NextResponse.json({
      success: true,
      content: generatedContent,
      qualityReport,
      creditsRemaining: creditResult.newBalance,
    })
  } catch (error) {
    console.error('Story generation error:', error)

    // Provide more specific error context
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Check for common AI API errors
    if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      return NextResponse.json(
        { error: 'AI service is temporarily busy. Please try again in a moment.' },
        { status: 429 }
      )
    }

    if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
      return NextResponse.json(
        { error: 'Generation is taking longer than expected. Please try again.' },
        { status: 504 }
      )
    }

    if (errorMessage.includes('API key') || errorMessage.includes('authentication')) {
      console.error('AI API authentication error - check API keys')
      return NextResponse.json(
        { error: 'AI service configuration error. Please contact support.' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to generate content. Please try again.' },
      { status: 500 }
    )
  }
}
