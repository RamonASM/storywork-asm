'use client'

import { ClerkProvider } from '@clerk/nextjs'

export function Providers({ children }: { children: React.ReactNode }) {
  // Skip Clerk during build/SSR if no publishable key
  if (typeof window === 'undefined' && !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return <>{children}</>
  }

  return <ClerkProvider>{children}</ClerkProvider>
}
