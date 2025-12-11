import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { stripe, subscriptionTiers } from '@/lib/stripe/client'
import { createAdminClient } from '@/lib/supabase/server'
import { addCredits } from '@/lib/credits/service'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createAdminClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        if (session.mode === 'subscription' && session.metadata?.userId) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          )

          const tier = session.metadata.tier as keyof typeof subscriptionTiers
          const tierConfig = subscriptionTiers[tier]

          // Update user with Stripe customer ID and subscription status
          await supabase
            .from('storywork_users')
            .update({
              stripe_customer_id: session.customer as string,
              subscription_status: 'active',
              subscription_tier: tier,
              updated_at: new Date().toISOString(),
            })
            .eq('id', session.metadata.userId)

          // Add initial credits based on tier
          if (tierConfig.stories > 0) {
            await addCredits(
              session.metadata.userId,
              tierConfig.stories * 75, // Each story costs 75 credits
              'subscription_monthly',
              `${tierConfig.name} subscription started`
            )
          }
        }
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string | null }

        if (invoice.subscription && invoice.billing_reason === 'subscription_cycle') {
          // Get user by Stripe customer ID
          const { data: user } = await supabase
            .from('storywork_users')
            .select('id, subscription_tier')
            .eq('stripe_customer_id', invoice.customer as string)
            .single()

          if (user?.subscription_tier) {
            const tier = user.subscription_tier as keyof typeof subscriptionTiers
            const tierConfig = subscriptionTiers[tier]

            // Add monthly credits
            if (tierConfig.stories > 0) {
              await addCredits(
                user.id,
                tierConfig.stories * 75,
                'subscription_monthly',
                `Monthly ${tierConfig.name} credit renewal`
              )
            }
          }
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription

        // Get user by Stripe customer ID
        const { data: user } = await supabase
          .from('storywork_users')
          .select('id')
          .eq('stripe_customer_id', subscription.customer as string)
          .single()

        if (user) {
          await supabase
            .from('storywork_users')
            .update({
              subscription_status: subscription.status,
              updated_at: new Date().toISOString(),
            })
            .eq('id', user.id)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription

        // Get user by Stripe customer ID
        const { data: user } = await supabase
          .from('storywork_users')
          .select('id')
          .eq('stripe_customer_id', subscription.customer as string)
          .single()

        if (user) {
          await supabase
            .from('storywork_users')
            .update({
              subscription_status: 'canceled',
              subscription_tier: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', user.id)
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
