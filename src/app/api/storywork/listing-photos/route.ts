import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type ListingPhoto = {
  listingId: string
  address: string
  lat?: number | null
  lng?: number | null
  photos: string[]
}

type AsmListing = {
  id: string
  address?: string
  lat?: number | null
  lng?: number | null
  photos?: string[]
  media_urls?: string[]
}

export async function GET(_request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Look up storywork_users to get asm_agent_id
    const supabase = createAdminClient()
    const { data: storyworkUser, error: userError } = await supabase
      .from('storywork_users')
      .select('asm_agent_id')
      .eq('clerk_id', userId)
      .single()

    if (userError || !storyworkUser?.asm_agent_id) {
      return NextResponse.json(
        { error: 'No linked ASM agent found. Link your account in Settings.' },
        { status: 404 }
      )
    }

    const portalUrl = process.env.ASM_PORTAL_URL
    const serviceKey = process.env.SERVICE_API_KEY

    if (!portalUrl || !serviceKey) {
      console.error('Missing ASM_PORTAL_URL or SERVICE_API_KEY env vars')
      return NextResponse.json(
        { error: 'Service configuration error' },
        { status: 500 }
      )
    }

    // Fetch listings from ASM Portal
    const response = await fetch(
      `${portalUrl}/api/agents/${storyworkUser.asm_agent_id}/listings?status=active`,
      {
        headers: {
          'X-Service-Key': serviceKey,
        },
      }
    )

    if (!response.ok) {
      console.error('ASM Portal listings fetch failed:', response.status, response.statusText)
      return NextResponse.json(
        { error: 'Failed to fetch listings from ASM Portal' },
        { status: 502 }
      )
    }

    const data = await response.json() as { listings?: AsmListing[] }
    const rawListings: AsmListing[] = data.listings ?? []

    // Map to our response format, max 10 photos per listing
    const listings: ListingPhoto[] = rawListings.map((listing) => {
      const photos = (listing.photos ?? listing.media_urls ?? []).slice(0, 10)
      return {
        listingId: listing.id,
        address: listing.address ?? '',
        lat: listing.lat ?? null,
        lng: listing.lng ?? null,
        photos,
      }
    })

    return NextResponse.json({ success: true, listings })
  } catch (error) {
    console.error('Listing photos error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
