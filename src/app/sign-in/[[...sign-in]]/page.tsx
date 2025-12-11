import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">Welcome to Storywork</h1>
          <p className="mt-2 text-neutral-400">Sign in to continue</p>
        </div>
        <SignIn
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'bg-neutral-900 border border-neutral-800',
              headerTitle: 'text-white',
              headerSubtitle: 'text-neutral-400',
              formFieldLabel: 'text-neutral-300',
              formFieldInput: 'bg-neutral-800 border-neutral-700 text-white',
              formButtonPrimary: 'bg-orange-500 hover:bg-orange-600',
              footerActionLink: 'text-orange-500 hover:text-orange-400',
              identityPreviewText: 'text-white',
              identityPreviewEditButton: 'text-orange-500',
            },
          }}
          fallbackRedirectUrl="/dashboard"
        />
      </div>
    </div>
  )
}
