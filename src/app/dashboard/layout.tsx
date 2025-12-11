export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { Home, Plus, Palette, Settings, Link as LinkIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getOrCreateUser, getBalance } from '@/lib/credits/service'

const navigation = [
  { name: 'Stories', href: '/dashboard', icon: Home },
  { name: 'New Story', href: '/dashboard/new', icon: Plus },
  { name: 'Brand Kit', href: '/dashboard/brand-kit', icon: Palette },
  { name: 'Link ASM', href: '/link-asm', icon: LinkIcon },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  const user = await currentUser()
  const email = user?.emailAddresses?.[0]?.emailAddress

  if (!email) {
    redirect('/sign-in')
  }

  // Get or create storywork user
  const storyworkUser = await getOrCreateUser(userId, email)
  const balance = await getBalance(storyworkUser.id)

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-xl font-bold text-neutral-900">
              Storywork <span className="text-[#ff4533]">by ASM</span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="hidden rounded-lg bg-neutral-100 px-3 py-1.5 sm:block">
              <span className="text-sm font-medium text-neutral-900">
                {balance.balance} credits
              </span>
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
          {/* Sidebar Navigation */}
          <nav className="hidden lg:block">
            <div className="sticky top-8 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              ))}

              <div className="mt-6 rounded-lg border border-neutral-200 bg-white p-4">
                <p className="text-sm font-medium text-neutral-900">Credits Balance</p>
                <p className="mt-1 text-2xl font-bold text-[#ff4533]">{balance.balance}</p>
                <p className="mt-1 text-xs text-neutral-500">
                  Lifetime earned: {balance.lifetimeEarned}
                </p>
                {storyworkUser.asm_agent_id && (
                  <p className="mt-2 text-xs text-green-600">ASM Account Linked</p>
                )}
              </div>
            </div>
          </nav>

          {/* Mobile Navigation */}
          <nav className="flex gap-2 overflow-x-auto pb-4 lg:hidden">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex flex-shrink-0 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700"
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Main Content */}
          <main>{children}</main>
        </div>
      </div>
    </div>
  )
}
