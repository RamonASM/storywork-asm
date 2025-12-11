import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { createCheckoutSession, SubscriptionTier } from '@/lib/stripe/client'
import { getOrCreateUser } from '@/lib/credits/service'

export const dynamic = 'force-dynamic'

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
    const { tier } = body

    if (!tier || !['starter', 'pro', 'team'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid subscription tier' }, { status: 400 })
    }

    // Get or create storywork user
    const storyworkUser = await getOrCreateUser(userId, email)

    // Create Stripe checkout session
    const session = await createCheckoutSession(
      storyworkUser.id,
      tier as SubscriptionTier,
      email
    )

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
