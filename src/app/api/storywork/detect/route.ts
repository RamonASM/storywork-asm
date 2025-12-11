import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { generateContent, parseJsonResponse } from '@/lib/ai/client'
import { detectStoryTypePrompt } from '@/lib/storywork/prompts'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { input } = body

    if (!input || typeof input !== 'string') {
      return NextResponse.json({ error: 'Input is required' }, { status: 400 })
    }

    const prompt = detectStoryTypePrompt(input)
    const response = await generateContent(prompt, { temperature: 0.3 })

    const parsed = parseJsonResponse<{
      detected_type: string
      confidence: number
      reasoning: string
    }>(response)

    if (!parsed) {
      return NextResponse.json({ error: 'Failed to detect story type' }, { status: 500 })
    }

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('Story detection error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
