import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { getOrCreateUser, linkAsmAccount } from '@/lib/credits/service'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { asmEmail } = body

    if (!asmEmail || typeof asmEmail !== 'string') {
      return NextResponse.json({ error: 'ASM email is required' }, { status: 400 })
    }

    // Get or create storywork user
    const storyworkUser = await getOrCreateUser(userId, email)

    // Link ASM account
    const result = await linkAsmAccount(storyworkUser.id, asmEmail)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Link ASM error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
