import Stripe from 'stripe'

// Lazy initialization to avoid build-time errors
let stripeClient: Stripe | null = null

export function getStripe(): Stripe {
  if (stripeClient) return stripeClient

  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set')
  }

  stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-11-17.clover',
  })

  return stripeClient
}

// For backwards compatibility - use getStripe() instead
export const stripe = new Proxy(
  {} as Stripe,
  {
    get(_target, prop) {
      return (getStripe() as Record<string, unknown>)[prop as string]
    },
  }
)

export const subscriptionTiers = {
  starter: {
    name: 'Starter',
    priceId: process.env.STRIPE_STARTER_PRICE_ID!,
    price: 49,
    stories: 10,
    features: ['10 stories/month', 'Text input', 'Basic carousels', 'Brand kit'],
  },
  pro: {
    name: 'Pro',
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    price: 99,
    stories: 30,
    features: [
      '30 stories/month',
      'Voice + text input',
      'Premium carousels',
      'Brand kit',
      'Priority generation',
    ],
  },
  team: {
    name: 'Team',
    priceId: process.env.STRIPE_TEAM_PRICE_ID!,
    price: 199,
    stories: -1, // unlimited
    features: [
      'Unlimited stories',
      'Voice + text input',
      'Premium carousels',
      'Team brand kits',
      'Priority generation',
      'Team analytics',
    ],
  },
} as const

export type SubscriptionTier = keyof typeof subscriptionTiers

export async function createCheckoutSession(
  userId: string,
  tier: SubscriptionTier,
  customerEmail: string
) {
  const stripeInstance = getStripe()
  const tierConfig = subscriptionTiers[tier]

  const session = await stripeInstance.checkout.sessions.create({
    mode: 'subscription',
    customer_email: customerEmail,
    line_items: [
      {
        price: tierConfig.priceId,
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?canceled=true`,
    metadata: {
      userId,
      tier,
    },
  })

  return session
}

export async function createCustomerPortalSession(customerId: string) {
  const stripeInstance = getStripe()

  const session = await stripeInstance.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings`,
  })

  return session
}
