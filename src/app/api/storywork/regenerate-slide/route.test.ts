import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
}))

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
    })),
  })),
}))

// Mock credits service
vi.mock('@/lib/credits/service', () => ({
  getOrCreateUser: vi.fn().mockResolvedValue({ id: 'user-123', email: 'test@test.com' }),
  spendCredits: vi.fn().mockResolvedValue({ success: true, newBalance: 100 }),
}))

// Mock AI client
vi.mock('@/lib/ai/client', () => ({
  generateContent: vi.fn().mockResolvedValue('{"headline":"New Headline","body":"New body text"}'),
  parseJsonResponse: vi.fn().mockReturnValue({ headline: 'New Headline', body: 'New body text' }),
}))

// Mock rate limiter
vi.mock('@/lib/rate-limit/limiter', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000, retryAfterMs: 0 }),
  RateLimits: { storyGeneration: { maxRequests: 10, windowMs: 60000 } },
  rateLimitHeaders: vi.fn().mockReturnValue({}),
}))

// Mock humanizer
vi.mock('@/lib/voice/humanizer', () => ({
  humanizeContent: vi.fn((text: string) => text),
}))

// Mock voice profile service
vi.mock('@/lib/voice/profile-service', () => ({
  getVoiceProfile: vi.fn().mockResolvedValue(null),
}))

import { POST } from './route'
import { auth, currentUser } from '@clerk/nextjs/server'

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/storywork/regenerate-slide', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

const validBody = {
  slide: { headline: 'Old Headline', body: 'Old body text here' },
  qualityFlags: ['Body has 45 words (max 40)'],
  storyId: '123e4567-e89b-12d3-a456-426614174000',
}

describe('POST /api/storywork/regenerate-slide', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 without auth', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as ReturnType<typeof auth> extends Promise<infer T> ? T : never)

    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(401)

    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 400 for invalid body (missing qualityFlags)', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user-clerk-123' } as ReturnType<typeof auth> extends Promise<infer T> ? T : never)
    vi.mocked(currentUser).mockResolvedValue({
      firstName: 'Test',
      emailAddresses: [{ emailAddress: 'test@test.com' }],
    } as Awaited<ReturnType<typeof currentUser>>)

    const res = await POST(makeRequest({
      slide: { headline: 'Test', body: 'Test body' },
      storyId: '123e4567-e89b-12d3-a456-426614174000',
      // missing qualityFlags
    }))

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('Validation error')
  })

  it('returns 400 for invalid body (empty slide headline)', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user-clerk-123' } as ReturnType<typeof auth> extends Promise<infer T> ? T : never)
    vi.mocked(currentUser).mockResolvedValue({
      firstName: 'Test',
      emailAddresses: [{ emailAddress: 'test@test.com' }],
    } as Awaited<ReturnType<typeof currentUser>>)

    const res = await POST(makeRequest({
      slide: { headline: '', body: 'Test body' },
      qualityFlags: ['some flag'],
      storyId: '123e4567-e89b-12d3-a456-426614174000',
    }))

    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid storyId (not UUID)', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user-clerk-123' } as ReturnType<typeof auth> extends Promise<infer T> ? T : never)
    vi.mocked(currentUser).mockResolvedValue({
      firstName: 'Test',
      emailAddresses: [{ emailAddress: 'test@test.com' }],
    } as Awaited<ReturnType<typeof currentUser>>)

    const res = await POST(makeRequest({
      slide: { headline: 'Test', body: 'Test body' },
      qualityFlags: ['some flag'],
      storyId: 'not-a-uuid',
    }))

    expect(res.status).toBe(400)
  })

  it('returns 200 with regenerated slide on success', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user-clerk-123' } as ReturnType<typeof auth> extends Promise<infer T> ? T : never)
    vi.mocked(currentUser).mockResolvedValue({
      firstName: 'Test',
      emailAddresses: [{ emailAddress: 'test@test.com' }],
    } as Awaited<ReturnType<typeof currentUser>>)

    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.slide).toBeDefined()
    expect(json.slide.headline).toBeDefined()
    expect(json.slide.body).toBeDefined()
    expect(json.creditsRemaining).toBe(100)
  })

  it('returns 402 when insufficient credits', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user-clerk-123' } as ReturnType<typeof auth> extends Promise<infer T> ? T : never)
    vi.mocked(currentUser).mockResolvedValue({
      firstName: 'Test',
      emailAddresses: [{ emailAddress: 'test@test.com' }],
    } as Awaited<ReturnType<typeof currentUser>>)

    const { spendCredits } = await import('@/lib/credits/service')
    vi.mocked(spendCredits).mockResolvedValueOnce({ success: false, newBalance: 0, error: 'Insufficient credits' })

    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(402)
  })

  it('returns 429 when rate limited', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user-clerk-123' } as ReturnType<typeof auth> extends Promise<infer T> ? T : never)

    const { checkRateLimit } = await import('@/lib/rate-limit/limiter')
    vi.mocked(checkRateLimit).mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 60000,
      retryAfterMs: 30000,
    })

    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(429)
  })
})
