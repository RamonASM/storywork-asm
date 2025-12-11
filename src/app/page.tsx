'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { SignInButton, SignUpButton, SignedIn, SignedOut } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
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
  Trophy,
  Home,
  Handshake,
} from 'lucide-react'

const features = [
  {
    icon: Mic,
    title: 'Voice Input',
    description: 'Record your story naturally and let AI extract the narrative',
    color: 'from-orange-500/20 to-red-500/20',
    iconColor: 'text-orange-400',
    borderColor: 'border-orange-500/20',
  },
  {
    icon: Type,
    title: 'Text Input',
    description: 'Type or paste your story details for precise control',
    color: 'from-blue-500/20 to-cyan-500/20',
    iconColor: 'text-blue-400',
    borderColor: 'border-blue-500/20',
  },
  {
    icon: Sparkles,
    title: 'Story Detection',
    description: 'AI identifies the best narrative archetype for your story',
    color: 'from-purple-500/20 to-pink-500/20',
    iconColor: 'text-purple-400',
    borderColor: 'border-purple-500/20',
  },
  {
    icon: MessageSquare,
    title: 'Guided Questions',
    description: 'Targeted questions help you craft the perfect narrative',
    color: 'from-cyan-500/20 to-teal-500/20',
    iconColor: 'text-cyan-400',
    borderColor: 'border-cyan-500/20',
  },
  {
    icon: Zap,
    title: 'AI Generation',
    description: 'Claude AI structures your story with hooks and beats',
    color: 'from-amber-500/20 to-orange-500/20',
    iconColor: 'text-amber-400',
    borderColor: 'border-amber-500/20',
  },
  {
    icon: Image,
    title: 'Carousel Creation',
    description: 'Beautiful branded 5-7 slide carousels ready for social',
    color: 'from-emerald-500/20 to-teal-500/20',
    iconColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/20',
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
    icon: Trophy,
    gradient: 'from-orange-500 to-red-500',
    bgGradient: 'from-orange-500/10 to-red-500/10',
  },
  {
    name: 'Fresh Drop',
    description: 'New listings, coming soon, property reveals',
    arc: 'Reveal → Features → CTA',
    icon: Home,
    gradient: 'from-blue-500 to-cyan-500',
    bgGradient: 'from-blue-500/10 to-cyan-500/10',
  },
  {
    name: 'Behind the Deal',
    description: 'Just closed, success stories, client testimonials',
    arc: 'Challenge → Resolution → Lesson',
    icon: Handshake,
    gradient: 'from-emerald-500 to-teal-500',
    bgGradient: 'from-emerald-500/10 to-teal-500/10',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-500/15 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-red-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute -bottom-40 right-1/3 w-72 h-72 bg-purple-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-slate-800/50 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-bold">
              Storywork <span className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">by ASM</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <a href="#features" className="text-sm text-slate-400 hover:text-white transition-colors">
              Features
            </a>
            <a href="#story-types" className="text-sm text-slate-400 hover:text-white transition-colors">
              Story Types
            </a>
            <a href="#pricing" className="text-sm text-slate-400 hover:text-white transition-colors">
              Pricing
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <SignedOut>
              <SignInButton mode="modal">
                <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-slate-800/50">
                  Sign In
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button size="sm" className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0">
                  Get Started
                </Button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Button asChild size="sm" className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            </SignedIn>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 py-24 sm:py-32 lg:py-40">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-700/50 bg-slate-800/50 px-4 py-1.5 text-sm text-slate-300 backdrop-blur-sm mb-8">
            <Sparkles className="h-4 w-4 text-orange-400" />
            <span>AI-Powered Storytelling</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
            <span className="block text-white">Turn Real Estate Stories Into</span>
            <span className="block bg-gradient-to-r from-orange-400 via-red-400 to-orange-400 bg-clip-text text-transparent">
              Scroll-Stopping Carousels
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto max-w-2xl text-lg sm:text-xl text-slate-400 leading-relaxed mb-10">
            Record your story, let AI detect the narrative, answer guided questions, and get
            beautiful branded carousels ready for Instagram in minutes.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <SignedOut>
              <SignUpButton mode="modal">
                <Button size="lg" className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all duration-300 hover:scale-105">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Button asChild size="lg" className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0 shadow-lg shadow-orange-500/25">
                <Link href="/dashboard">
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </SignedIn>
            <Button variant="outline" size="lg" className="border-slate-700 text-slate-300 hover:bg-slate-800/50 hover:text-white hover:border-slate-600 transition-all duration-300" asChild>
              <a href="#story-types">See Examples</a>
            </Button>
          </div>

          <div className="mt-6 text-sm text-slate-500">
            Already an ASM client?{' '}
            <Link href="/link-asm" className="text-orange-400 hover:text-orange-300 underline transition-colors">
              Use your referral credits here
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              How It <span className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">Works</span>
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              From story to carousel in three simple steps
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="group relative rounded-2xl border border-slate-800/50 bg-gradient-to-br from-slate-900/80 to-slate-800/30 p-8 backdrop-blur-sm hover:border-slate-700/80 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/5"
              >
                <div className="absolute top-4 right-4 text-xs font-medium text-slate-600">
                  {String(index + 1).padStart(2, '0')}
                </div>
                <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center border ${feature.borderColor} mb-4`}>
                  <feature.icon className={`h-6 w-6 ${feature.iconColor}`} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story Types */}
      <section id="story-types" className="relative z-10 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Story <span className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">Types</span>
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              AI detects which narrative archetype fits your story best
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {storyTypes.map((type) => (
              <div
                key={type.name}
                className={`group relative rounded-2xl border border-slate-800/50 bg-gradient-to-br ${type.bgGradient} p-8 backdrop-blur-sm hover:border-slate-700/80 transition-all duration-300`}
              >
                <div className={`h-14 w-14 rounded-xl bg-gradient-to-br ${type.gradient} flex items-center justify-center mb-6`}>
                  <type.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className={`text-xl font-bold bg-gradient-to-r ${type.gradient} bg-clip-text text-transparent mb-2`}>
                  {type.name}
                </h3>
                <p className="text-slate-300 mb-4">{type.description}</p>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span className="font-medium">Arc:</span>
                  <span>{type.arc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative z-10 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Simple, <span className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">Transparent</span> Pricing
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Start free for 7 days, then pick the plan that fits your needs
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {pricingTiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative rounded-2xl border ${
                  tier.popular
                    ? 'border-orange-500/50 bg-gradient-to-br from-orange-500/10 to-red-500/10 shadow-lg shadow-orange-500/10 scale-105'
                    : 'border-slate-800/50 bg-gradient-to-br from-slate-900/80 to-slate-800/30'
                } p-8 backdrop-blur-sm transition-all duration-300`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0">
                      Most Popular
                    </Badge>
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold text-white">{tier.name}</h3>
                  <p className="text-slate-400 text-sm mt-1">{tier.description}</p>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-white">{tier.price}</span>
                    <span className="text-slate-500">{tier.period}</span>
                  </div>
                  <p className={`mt-2 text-sm font-medium ${tier.popular ? 'text-orange-400' : 'text-slate-400'}`}>
                    {tier.stories}
                  </p>
                </div>
                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <Check className={`h-4 w-4 ${tier.popular ? 'text-orange-400' : 'text-emerald-400'}`} />
                      <span className="text-sm text-slate-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                <SignedOut>
                  <SignUpButton mode="modal">
                    <Button
                      className={`w-full ${
                        tier.popular
                          ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0'
                          : 'bg-transparent border border-slate-700 text-slate-300 hover:bg-slate-800/50 hover:text-white'
                      }`}
                    >
                      {tier.cta}
                    </Button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <Button
                    className={`w-full ${
                      tier.popular
                        ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0'
                        : 'bg-transparent border border-slate-700 text-slate-300 hover:bg-slate-800/50 hover:text-white'
                    }`}
                    asChild
                  >
                    <Link href="/dashboard/settings">{tier.cta}</Link>
                  </Button>
                </SignedIn>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-slate-400">
              <strong className="text-white">Already an ASM client?</strong> Your referral credits work here too!
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Link your ASM account to use credits earned from referrals
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl border border-slate-800/50 bg-gradient-to-br from-slate-900/90 to-slate-800/50 p-12 sm:p-16 text-center overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-0 left-1/4 w-64 h-64 bg-orange-500/10 rounded-full blur-[80px]" />
              <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-red-500/10 rounded-full blur-[80px]" />
            </div>

            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Ready to Transform Your Real Estate Stories?
              </h2>
              <p className="text-slate-400 max-w-xl mx-auto mb-8">
                Join hundreds of agents creating engaging content with Storywork
              </p>
              <SignedOut>
                <SignUpButton mode="modal">
                  <Button size="lg" className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0 shadow-lg shadow-orange-500/25">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <Button size="lg" className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0 shadow-lg shadow-orange-500/25" asChild>
                  <Link href="/dashboard">
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </SignedIn>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/50 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                <Sparkles className="h-3 w-3 text-white" />
              </div>
              <span className="text-sm text-slate-500">
                &copy; {new Date().getFullYear()} Storywork by Aerial Shots Media
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-500">
              <a href="#" className="hover:text-slate-300 transition-colors">Privacy</a>
              <a href="#" className="hover:text-slate-300 transition-colors">Terms</a>
              <a href="https://aerialshots.media" className="hover:text-slate-300 transition-colors">ASM Website</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
