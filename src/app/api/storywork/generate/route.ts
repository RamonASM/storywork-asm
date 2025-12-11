import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/server'
import { generateContent, parseJsonResponse } from '@/lib/ai/client'
import { generateStoryContentPrompt } from '@/lib/storywork/prompts'
import { spendCredits, getOrCreateUser } from '@/lib/credits/service'

export const dynamic = 'force-dynamic'

const GENERATION_COST = 75

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await currentUser()
    const email = user?.emailAddresses?.[0]?.emailAddress

    if (!email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 400 })
    }

    const body = await request.json()
    const { storyId, storyType, answers } = body

    if (!storyId || !storyType || !answers) {
      return NextResponse.json(
        { error: 'Story ID, type, and answers are required' },
        { status: 400 }
      )
    }

    // Get or create storywork user
    const storyworkUser = await getOrCreateUser(userId, email)

    // Spend credits
    const creditResult = await spendCredits(
      storyworkUser.id,
      GENERATION_COST,
      'storywork_carousel',
      `Story generation: ${storyId}`
    )

    if (!creditResult.success) {
      return NextResponse.json(
        { error: creditResult.error || 'Insufficient credits', balance: creditResult.newBalance },
        { status: 402 }
      )
    }

    // Generate content
    const agentName = user?.firstName || 'Agent'
    const prompt = generateStoryContentPrompt(storyType, answers, agentName)

    if (!prompt) {
      return NextResponse.json({ error: 'Invalid story type' }, { status: 400 })
    }

    const response = await generateContent(prompt, { temperature: 0.7 })

    const generatedContent = parseJsonResponse<{
      slides: Array<{
        headline: string
        body: string
        visual_suggestion: string
      }>
      hashtags: string[]
      caption: string
    }>(response)

    if (!generatedContent) {
      return NextResponse.json({ error: 'Failed to generate content' }, { status: 500 })
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

    return NextResponse.json({
      success: true,
      content: generatedContent,
      creditsRemaining: creditResult.newBalance,
    })
  } catch (error) {
    console.error('Story generation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
