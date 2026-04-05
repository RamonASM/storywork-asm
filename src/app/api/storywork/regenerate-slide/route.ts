import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { generateContent, parseJsonResponse } from '@/lib/ai/client'
import { AI_PRESETS } from '@/lib/ai/config'
import { spendCredits, getOrCreateUser } from '@/lib/credits/service'
import { CREDIT_COSTS } from '@/lib/credits/config'
import { checkRateLimit, RateLimits, rateLimitHeaders } from '@/lib/rate-limit/limiter'
import { humanizeContent } from '@/lib/voice/humanizer'
import { getVoiceProfile } from '@/lib/voice/profile-service'
import { DEFAULT_VOICE_PROFILE } from '@/lib/voice/types'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const regenerateSlideSchema = z.object({
  slide: z.object({
    headline: z.string().min(1),
    body: z.string().min(1),
  }),
  qualityFlags: z.array(z.string()).min(1, 'At least one quality flag is required'),
  storyId: z.string().uuid(),
  locationContext: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(`regenerate:${userId}`, RateLimits.storyGeneration)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before regenerating.' },
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

    const validation = regenerateSlideSchema.safeParse(body)
    if (!validation.success) {
      const firstIssue = validation.error.issues[0]
      return NextResponse.json(
        { error: `Validation error: ${firstIssue.message}`, details: validation.error.issues },
        { status: 400 }
      )
    }

    const { slide, qualityFlags, storyId, locationContext } = validation.data

    // Get or create storywork user and spend credits
    const storyworkUser = await getOrCreateUser(userId, email)

    const creditResult = await spendCredits(
      storyworkUser.id,
      CREDIT_COSTS.slideRegeneration,
      'storywork_slide_regen',
      `Slide regen: ${storyId}`
    )

    if (!creditResult.success) {
      return NextResponse.json(
        { error: creditResult.error || 'Insufficient credits', balance: creditResult.newBalance },
        { status: 402 }
      )
    }

    // Get user's voice profile
    let voiceProfile = await getVoiceProfile(storyworkUser.id)
    if (!voiceProfile) {
      voiceProfile = {
        id: '',
        userId: storyworkUser.id,
        createdAt: new Date().toISOString(),
        ...DEFAULT_VOICE_PROFILE,
      }
    }

    // Build targeted prompt for fixing specific quality issues
    const flagsList = qualityFlags.map((f) => `- ${f}`).join('\n')
    const locationLine = locationContext ? `\nLocation context: ${locationContext}` : ''

    const prompt = `You are rewriting a single carousel slide for a real estate agent's Instagram.

Current slide:
Headline: "${slide.headline}"
Body: "${slide.body}"
${locationLine}

The following quality issues were flagged:
${flagsList}

Rewrite ONLY this slide to fix the flagged issues. Keep the core message but improve it.

Rules:
- Headline: max 8 words, punchy and engaging
- Body: max 40 words, conversational and specific
- Do NOT use generic AI phrases like "nestled in", "boasts", "stunning"
- Sound like a real person, not a chatbot
- If readability was flagged, use simpler words (target 6th-8th grade reading level)
- If conciseness was flagged, cut unnecessary words aggressively
- If authenticity was flagged, add specific details and use contractions

Return JSON only:
{
  "headline": "...",
  "body": "..."
}`

    const response = await generateContent(prompt, AI_PRESETS.storyGeneration)

    const rawSlide = parseJsonResponse<{ headline: string; body: string }>(response)

    if (!rawSlide) {
      return NextResponse.json({ error: 'Failed to regenerate slide' }, { status: 500 })
    }

    // Apply humanizer
    const humanizedSlide = {
      headline: humanizeContent(rawSlide.headline, voiceProfile),
      body: humanizeContent(rawSlide.body, voiceProfile),
    }

    return NextResponse.json({
      success: true,
      slide: humanizedSlide,
      creditsRemaining: creditResult.newBalance,
    })
  } catch (error) {
    console.error('Slide regeneration error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      return NextResponse.json(
        { error: 'AI service is temporarily busy. Please try again in a moment.' },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to regenerate slide. Please try again.' },
      { status: 500 }
    )
  }
}
