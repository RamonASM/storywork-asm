'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { SignInButton, SignUpButton, SignedIn, SignedOut } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Mic,
  Type,
  Sparkles,
  Zap,
  Image,
  Check,
  ArrowRight,
  MessageSquare,
} from 'lucide-react'

const features = [
  {
    icon: Mic,
    title: 'Voice Input',
    description: 'Record your story naturally and let AI extract the narrative',
  },
  {
    icon: Type,
    title: 'Text Input',
    description: 'Type or paste your story details for precise control',
  },
  {
    icon: Sparkles,
    title: 'Story Detection',
    description: 'AI identifies the best narrative archetype for your story',
  },
  {
    icon: MessageSquare,
    title: 'Guided Questions',
    description: 'Targeted questions help you craft the perfect narrative',
  },
  {
    icon: Zap,
    title: 'AI Generation',
    description: 'Claude AI structures your story with hooks and beats',
  },
  {
    icon: Image,
    title: 'Carousel Creation',
    description: 'Beautiful branded 5-7 slide carousels ready for social',
  },
]

const pricingTiers = [
  {
    name: 'Starter',
    price: '$49',
    period: '/month',
    description: 'Perfect for part-time agents',
    stories: '10 stories/month',
    features: ['Text input', 'Basic carousels', 'Brand kit', 'Email support'],
    cta: 'Start Free Trial',
    popular: false,
  },
  {
    name: 'Pro',
    price: '$99',
    period: '/month',
    description: 'For active real estate agents',
    stories: '30 stories/month',
    features: [
      'Voice + text input',
      'Premium carousels',
      'Brand kit',
      'Priority generation',
      'Chat support',
    ],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Team',
    price: '$199',
    period: '/month',
    description: 'For brokerages and teams',
    stories: 'Unlimited stories',
    features: [
      'Voice + text input',
      'Premium carousels',
      'Team brand kits',
      'Priority generation',
      'Team analytics',
      'Dedicated support',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
]

const storyTypes = [
  {
    name: 'Against the Odds',
    description: 'Bidding wars, difficult deals, challenges overcome',
    arc: 'Challenge → Strategy → Victory',
    color: 'bg-orange-100 text-orange-700',
  },
  {
    name: 'Fresh Drop',
    description: 'New listings, coming soon, property reveals',
    arc: 'Reveal → Features → CTA',
    color: 'bg-blue-100 text-blue-700',
  },
  {
    name: 'Behind the Deal',
    description: 'Just closed, success stories, client testimonials',
    arc: 'Challenge → Resolution → Lesson',
    color: 'bg-green-100 text-green-700',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-neutral-200">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-neutral-900">
              Storywork <span className="text-[#ff4533]">by ASM</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <a href="#features" className="text-sm text-neutral-600 hover:text-neutral-900">
              Features
            </a>
            <a href="#story-types" className="text-sm text-neutral-600 hover:text-neutral-900">
              Story Types
            </a>
            <a href="#pricing" className="text-sm text-neutral-600 hover:text-neutral-900">
              Pricing
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <SignedOut>
              <SignInButton mode="modal">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button size="sm">Get Started</Button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Button asChild size="sm">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            </SignedIn>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-neutral-50 to-white py-20">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <Badge variant="secondary" className="mb-4">
            AI-Powered Storytelling
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl">
            Turn Real Estate Stories Into
            <br />
            <span className="text-[#ff4533]">Scroll-Stopping Carousels</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-neutral-600">
            Record your story, let AI detect the narrative, answer guided questions, and get
            beautiful branded carousels ready for Instagram in minutes.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <SignedOut>
              <SignUpButton mode="modal">
                <Button size="lg">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Button asChild size="lg">
                <Link href="/dashboard">
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </SignedIn>
            <Button variant="outline" size="lg" asChild>
              <a href="#story-types">See Examples</a>
            </Button>
          </div>

          <div className="mt-6 text-sm text-neutral-500">
            Already an ASM client?{' '}
            <Link href="/link-asm" className="text-[#ff4533] underline">
              Use your referral credits here
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-neutral-900">How It Works</h2>
            <p className="mt-4 text-lg text-neutral-600">
              From story to carousel in three simple steps
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="border-neutral-200">
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-100">
                    <feature.icon className="h-6 w-6 text-neutral-900" />
                  </div>
                  <CardTitle className="mt-4">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Story Types */}
      <section id="story-types" className="bg-neutral-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-neutral-900">Story Types</h2>
            <p className="mt-4 text-lg text-neutral-600">
              AI detects which narrative archetype fits your story best
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {storyTypes.map((type) => (
              <Card key={type.name} className="border-neutral-200 bg-white">
                <CardHeader>
                  <Badge className={type.color}>{type.name}</Badge>
                  <CardTitle className="mt-4">{type.description}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-neutral-500">
                    <strong>Narrative Arc:</strong> {type.arc}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-neutral-900">Simple, Transparent Pricing</h2>
            <p className="mt-4 text-lg text-neutral-600">
              Start free for 7 days, then pick the plan that fits your needs
            </p>
          </div>

          <div className="mt-16 grid gap-8 lg:grid-cols-3">
            {pricingTiers.map((tier) => (
              <Card
                key={tier.name}
                className={`relative border-2 ${tier.popular ? 'border-[#ff4533]' : 'border-neutral-200'}`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-[#ff4533] text-white">Most Popular</Badge>
                  </div>
                )}
                <CardHeader className="text-center">
                  <CardTitle>{tier.name}</CardTitle>
                  <CardDescription>{tier.description}</CardDescription>
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
                  <SignedOut>
                    <SignUpButton mode="modal">
                      <Button
                        className="mt-6 w-full"
                        variant={tier.popular ? 'default' : 'outline'}
                      >
                        {tier.cta}
                      </Button>
                    </SignUpButton>
                  </SignedOut>
                  <SignedIn>
                    <Button
                      className="mt-6 w-full"
                      variant={tier.popular ? 'default' : 'outline'}
                      asChild
                    >
                      <Link href="/dashboard/settings">{tier.cta}</Link>
                    </Button>
                  </SignedIn>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-neutral-600">
              <strong>Already an ASM client?</strong> Your referral credits work here too!
            </p>
            <p className="mt-2 text-sm text-neutral-500">
              Link your ASM account to use credits earned from referrals
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-neutral-900 py-20">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white">
            Ready to Transform Your Real Estate Stories?
          </h2>
          <p className="mt-4 text-lg text-neutral-400">
            Join hundreds of agents creating engaging content with Storywork
          </p>
          <SignedOut>
            <SignUpButton mode="modal">
              <Button size="lg" className="mt-8 bg-[#ff4533] hover:bg-[#e63d2e]">
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <Button size="lg" className="mt-8 bg-[#ff4533] hover:bg-[#e63d2e]" asChild>
              <Link href="/dashboard">
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </SignedIn>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-500">
              &copy; {new Date().getFullYear()} Storywork by Aerial Shots Media
            </span>
            <div className="flex items-center gap-4">
              <a href="#" className="text-sm text-neutral-500 hover:text-neutral-700">
                Privacy
              </a>
              <a href="#" className="text-sm text-neutral-500 hover:text-neutral-700">
                Terms
              </a>
              <a
                href="https://aerialshots.media"
                className="text-sm text-neutral-500 hover:text-neutral-700"
              >
                ASM Website
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
