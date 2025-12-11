'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useUser, SignInButton, SignedIn, SignedOut } from '@clerk/nextjs'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Link as LinkIcon, Check, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LinkAsmPage() {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLinked, setIsLinked] = useState(false)
  const [linkedEmail, setLinkedEmail] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    async function checkLinkStatus() {
      if (!isLoaded || !user) {
        setChecking(false)
        return
      }

      const { data: storyworkUser } = await supabase
        .from('storywork_users')
        .select('asm_agent_id')
        .eq('clerk_id', user.id)
        .single()

      if (storyworkUser?.asm_agent_id) {
        // Get the linked agent's email
        const { data: agent } = await supabase
          .from('agents')
          .select('email')
          .eq('id', storyworkUser.asm_agent_id)
          .single()

        setIsLinked(true)
        setLinkedEmail(agent?.email || null)
      }

      setChecking(false)
    }

    checkLinkStatus()
  }, [supabase, user, isLoaded])

  const handleLinkAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !user) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/credits/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asmEmail: email }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(true)
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      } else {
        setError(data.error || 'Failed to link account')
      }
    } catch (err) {
      console.error('Link error:', err)
      setError('Failed to link account')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-neutral-900">
              Storywork <span className="text-[#ff4533]">by ASM</span>
            </span>
          </Link>

          <SignedIn>
            <Button variant="ghost" asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          </SignedIn>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-16">
        <Button variant="ghost" size="sm" asChild className="mb-8">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>

        <SignedOut>
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
                <LinkIcon className="h-6 w-6 text-neutral-700" />
              </div>
              <CardTitle className="mt-4">Link Your ASM Account</CardTitle>
              <CardDescription>
                Sign in to Storywork first, then link your ASM Portal account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SignInButton mode="modal">
                <Button className="w-full">Sign In to Continue</Button>
              </SignInButton>
            </CardContent>
          </Card>
        </SignedOut>

        <SignedIn>
          {isLinked ? (
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle className="mt-4">Account Already Linked</CardTitle>
                <CardDescription>
                  Your Storywork account is linked to ASM Portal
                  {linkedEmail && (
                    <span className="mt-1 block font-medium text-neutral-700">
                      {linkedEmail}
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-center text-sm text-neutral-600">
                  Your ASM referral credits are now available in Storywork!
                </p>
                <Button asChild className="w-full">
                  <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
              </CardContent>
            </Card>
          ) : success ? (
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle className="mt-4">Account Linked!</CardTitle>
                <CardDescription>
                  Your ASM Portal credits are now available in Storywork
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center text-sm text-neutral-600">
                  Redirecting to dashboard...
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
                  <LinkIcon className="h-6 w-6 text-neutral-700" />
                </div>
                <CardTitle className="mt-4">Link Your ASM Account</CardTitle>
                <CardDescription>
                  Connect your ASM Portal account to use referral credits in Storywork
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLinkAccount} className="space-y-4">
                  <div>
                    <Label htmlFor="email">ASM Portal Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="mt-1"
                      required
                    />
                    <p className="mt-1 text-xs text-neutral-500">
                      Enter the email address you use with ASM Portal
                    </p>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      {error}
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={loading || !email.trim()}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Linking...
                      </>
                    ) : (
                      <>
                        <LinkIcon className="mr-2 h-4 w-4" />
                        Link Account
                      </>
                    )}
                  </Button>
                </form>

                <div className="mt-6 rounded-lg bg-neutral-50 p-4">
                  <h4 className="font-medium text-neutral-900">Why link your account?</h4>
                  <ul className="mt-2 space-y-1 text-sm text-neutral-600">
                    <li>Use referral credits earned in ASM Portal</li>
                    <li>Unified credit balance across platforms</li>
                    <li>Access premium features with earned credits</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}
        </SignedIn>
      </div>
    </div>
  )
}
