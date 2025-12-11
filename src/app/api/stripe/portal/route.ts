import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { createCustomerPortalSession } from '@/lib/stripe/client'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST() {
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

    const supabase = createAdminClient()

    // Get storywork user with Stripe customer ID
    const { data: storyworkUser } = await supabase
      .from('storywork_users')
      .select('stripe_customer_id')
      .eq('clerk_id', userId)
      .single()

    if (!storyworkUser?.stripe_customer_id) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    // Create portal session
    const session = await createCustomerPortalSession(storyworkUser.stripe_customer_id)

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Portal error:', error)
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 })
  }
}
