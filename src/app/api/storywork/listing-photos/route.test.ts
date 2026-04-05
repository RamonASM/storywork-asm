import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}))

// Mock Supabase
const mockSingle = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: mockSingle,
    })),
  })),
}))

import { GET } from './route'
import { auth } from '@clerk/nextjs/server'

function makeRequest(): NextRequest {
  return new NextRequest('http://localhost/api/storywork/listing-photos', {
    method: 'GET',
  })
}

const mockListings = [
  {
    id: 'listing-1',
    address: '123 Main St',
    lat: 28.5,
    lng: -81.3,
    photos: ['https://cdn.example.com/photo1.jpg', 'https://cdn.example.com/photo2.webp'],
  },
  {
    id: 'listing-2',
    address: '456 Oak Ave',
    photos: Array.from({ length: 15 }, (_, i) => `https://cdn.example.com/img${i}.jpg`),
  },
]

describe('GET /api/storywork/listing-photos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Set env vars
    process.env.ASM_PORTAL_URL = 'https://app.aerialshots.media'
    process.env.SERVICE_API_KEY = 'test-service-key'
  })

  it('returns 401 without auth', async () => {
    vi.mocked(auth).mockResolvedValue(
      { userId: null } as ReturnType<typeof auth> extends Promise<infer T> ? T : never
    )

    const res = await GET(makeRequest())
    expect(res.status).toBe(401)

    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 404 when user has no asm_agent_id', async () => {
    vi.mocked(auth).mockResolvedValue(
      { userId: 'user-clerk-123' } as ReturnType<typeof auth> extends Promise<infer T> ? T : never
    )
    mockSingle.mockResolvedValue({
      data: { asm_agent_id: null },
      error: null,
    })

    const res = await GET(makeRequest())
    expect(res.status).toBe(404)

    const json = await res.json()
    expect(json.error).toContain('No linked ASM agent')
  })

  it('returns 404 when storywork_users row not found', async () => {
    vi.mocked(auth).mockResolvedValue(
      { userId: 'user-clerk-123' } as ReturnType<typeof auth> extends Promise<infer T> ? T : never
    )
    mockSingle.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116' },
    })

    const res = await GET(makeRequest())
    expect(res.status).toBe(404)
  })

  it('returns listings with photos capped at 10', async () => {
    vi.mocked(auth).mockResolvedValue(
      { userId: 'user-clerk-123' } as ReturnType<typeof auth> extends Promise<infer T> ? T : never
    )
    mockSingle.mockResolvedValue({
      data: { asm_agent_id: 'agent-abc' },
      error: null,
    })

    // Mock fetch for ASM Portal
    const originalFetch = global.fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ listings: mockListings }),
    })

    const res = await GET(makeRequest())
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.listings).toHaveLength(2)

    // First listing: 2 photos (under limit)
    expect(json.listings[0].listingId).toBe('listing-1')
    expect(json.listings[0].address).toBe('123 Main St')
    expect(json.listings[0].photos).toHaveLength(2)

    // Second listing: capped at 10
    expect(json.listings[1].photos).toHaveLength(10)

    // Verify fetch was called with correct URL and headers
    expect(global.fetch).toHaveBeenCalledWith(
      'https://app.aerialshots.media/api/agents/agent-abc/listings?status=active',
      expect.objectContaining({
        headers: { 'X-Service-Key': 'test-service-key' },
      })
    )

    global.fetch = originalFetch
  })

  it('returns 502 when ASM Portal request fails', async () => {
    vi.mocked(auth).mockResolvedValue(
      { userId: 'user-clerk-123' } as ReturnType<typeof auth> extends Promise<infer T> ? T : never
    )
    mockSingle.mockResolvedValue({
      data: { asm_agent_id: 'agent-abc' },
      error: null,
    })

    const originalFetch = global.fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    })

    const res = await GET(makeRequest())
    expect(res.status).toBe(502)

    global.fetch = originalFetch
  })
})
