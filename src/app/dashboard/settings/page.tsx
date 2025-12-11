'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, CreditCard, Loader2, ExternalLink, Check, Crown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const subscriptionTiers = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$49',
    period: '/month',
    stories: '10 stories/month',
    features: ['Text input', 'Basic carousels', 'Brand kit', 'Email support'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$99',
    period: '/month',
    stories: '30 stories/month',
    features: [
      'Voice + text input',
      'Premium carousels',
      'Brand kit',
      'Priority generation',
      'Chat support',
    ],
    popular: true,
  },
  {
    id: 'team',
    name: 'Team',
    price: '$199',
    period: '/month',
    stories: 'Unlimited stories',
    features: [
      'Voice + text input',
      'Premium carousels',
      'Team brand kits',
      'Priority generation',
      'Team analytics',
      'Dedicated support',
    ],
  },
]

interface StoryworkUser {
  id: string
  stripe_customer_id: string | null
  subscription_status: string | null
  subscription_tier: string | null
  credit_balance: number
  asm_agent_id: string | null
}

export default function SettingsPage() {
  const { user } = useUser()
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState<string | null>(null)
  const [storyworkUser, setStoryworkUser] = useState<StoryworkUser | null>(null)

  const supabase = createClient()

  useEffect(() => {
    async function loadUser() {
      if (!user) return

      const { data } = await supabase
        .from('storywork_users')
        .select('*')
        .eq('clerk_id', user.id)
        .single()

      setStoryworkUser(data as StoryworkUser | null)
      setLoading(false)
    }

    loadUser()
  }, [supabase, user])

  const handleSubscribe = async (tier: string) => {
    setSubscribing(tier)

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || 'Failed to create checkout session')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Failed to start checkout')
    } finally {
      setSubscribing(null)
    }
  }

  const handleManageSubscription = async () => {
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || 'Failed to open customer portal')
      }
    } catch (error) {
      console.error('Portal error:', error)
      alert('Failed to open customer portal')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    )
  }

  const currentTier = storyworkUser?.subscription_tier
  const hasActiveSubscription = storyworkUser?.subscription_status === 'active'

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Settings</h1>
          <p className="mt-1 text-neutral-600">Manage your subscription and account</p>
        </div>
      </div>

      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle>Account Status</CardTitle>
          <CardDescription>Your current subscription and credits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-neutral-200 p-4">
              <p className="text-sm text-neutral-500">Subscription</p>
              <p className="mt-1 text-lg font-semibold text-neutral-900">
                {hasActiveSubscription ? (
                  <span className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-yellow-500" />
                    {currentTier
                      ? subscriptionTiers.find((t) => t.id === currentTier)?.name
                      : 'Active'}
                  </span>
                ) : (
                  'Free'
                )}
              </p>
            </div>
            <div className="rounded-lg border border-neutral-200 p-4">
              <p className="text-sm text-neutral-500">Credits Balance</p>
              <p className="mt-1 text-lg font-semibold text-neutral-900">
                {storyworkUser?.credit_balance || 0}
              </p>
            </div>
            <div className="rounded-lg border border-neutral-200 p-4">
              <p className="text-sm text-neutral-500">ASM Account</p>
              <p className="mt-1 text-lg font-semibold text-neutral-900">
                {storyworkUser?.asm_agent_id ? (
                  <span className="text-green-600">Linked</span>
                ) : (
                  <Link href="/link-asm" className="text-[#ff4533] underline">
                    Not linked
                  </Link>
                )}
              </p>
            </div>
          </div>

          {hasActiveSubscription && storyworkUser?.stripe_customer_id && (
            <Button variant="outline" className="mt-4" onClick={handleManageSubscription}>
              <CreditCard className="mr-2 h-4 w-4" />
              Manage Subscription
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Subscription Plans */}
      {!hasActiveSubscription && (
        <>
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Choose a Plan</h2>
            <p className="mt-1 text-neutral-600">
              Subscribe to get monthly story credits and premium features
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {subscriptionTiers.map((tier) => (
              <Card
                key={tier.id}
                className={`relative ${tier.popular ? 'border-2 border-[#ff4533]' : ''}`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-[#ff4533] text-white">Most Popular</Badge>
                  </div>
                )}
                <CardHeader className="text-center">
                  <CardTitle>{tier.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-neutral-900">{tier.price}</span>
                    <span className="text-neutral-500">{tier.period}</span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-[#ff4533]">{tier.stories}</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-neutral-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="mt-6 w-full"
                    variant={tier.popular ? 'default' : 'outline'}
                    onClick={() => handleSubscribe(tier.id)}
                    disabled={!!subscribing}
                  >
                    {subscribing === tier.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Subscribe'
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Credits Info */}
      <Card>
        <CardHeader>
          <CardTitle>Credits System</CardTitle>
          <CardDescription>How credits work in Storywork</CardDescription>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <ul className="list-disc pl-4 text-neutral-600">
            <li>Basic text story: 50 credits</li>
            <li>Voice story: 60 credits</li>
            <li>Full carousel generation: 75 credits</li>
          </ul>
          <p className="mt-4 text-neutral-600">
            <strong>ASM Clients:</strong> You can use referral credits earned from the ASM Portal
            here! Just{' '}
            <Link href="/link-asm" className="text-[#ff4533]">
              link your ASM account
            </Link>{' '}
            to access your credits.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
