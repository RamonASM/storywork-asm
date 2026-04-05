import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchLifeHereData, buildLocationContext } from './life-here-client'
import type { LifeHereData } from './types'

const mockLifeHereResponse = {
  overallScore: 82,
  label: 'Great',
  profile: 'balanced',
  dining: {
    score: 78,
    restaurantCount: 45,
    topCuisines: ['Italian', 'Mexican', 'Japanese'],
    topRated: ['Enzo Table', 'Taco Loco'],
  },
  commute: {
    airportMinutes: 25,
    beachMinutes: 55,
    downtownMinutes: 12,
    themeParkMinutes: 18,
  },
  lifestyle: {
    score: 85,
    gymCount: 8,
    parkCount: 12,
    entertainmentVenues: 6,
  },
  convenience: {
    score: 90,
    nearestGroceryMiles: 0.4,
  },
}

describe('fetchLifeHereData', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      ASM_PORTAL_URL: 'https://app.aerialshots.media',
      ASM_LIFE_HERE_SECRET: 'test-secret-key',
    }
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  it('returns null when ASM_PORTAL_URL is missing', async () => {
    delete process.env.ASM_PORTAL_URL

    const result = await fetchLifeHereData(28.5383, -81.3792)

    expect(result).toBeNull()
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('missing ASM_PORTAL_URL')
    )
  })

  it('returns null when ASM_LIFE_HERE_SECRET is missing', async () => {
    delete process.env.ASM_LIFE_HERE_SECRET

    const result = await fetchLifeHereData(28.5383, -81.3792)

    expect(result).toBeNull()
  })

  it('parses a successful response correctly', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockLifeHereResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const result = await fetchLifeHereData(28.5383, -81.3792, 'balanced')

    expect(result).not.toBeNull()
    expect(result!.overallScore).toBe(82)
    expect(result!.label).toBe('Great')
    expect(result!.dining.restaurantCount).toBe(45)
    expect(result!.dining.topCuisines).toEqual(['Italian', 'Mexican', 'Japanese'])
    expect(result!.commute.airportMinutes).toBe(25)
    expect(result!.lifestyle.parkCount).toBe(12)
    expect(result!.convenience.nearestGroceryMiles).toBe(0.4)

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://app.aerialshots.media/api/v1/location/scores?lat=28.5383&lng=-81.3792&profile=balanced',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-ASM-Secret': 'test-secret-key',
        }),
      })
    )
  })

  it('returns null on API error (500)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Internal Server Error', { status: 500 })
    )

    const result = await fetchLifeHereData(28.5383, -81.3792)

    expect(result).toBeNull()
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('returned 500')
    )
  })

  it('returns null on timeout', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          const error = new DOMException('The operation was aborted', 'AbortError')
          reject(error)
        })
    )

    const result = await fetchLifeHereData(28.5383, -81.3792)

    expect(result).toBeNull()
    expect(console.error).toHaveBeenCalledWith('Life Here API request timed out')
  })

  it('returns null on network error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('ECONNREFUSED'))

    const result = await fetchLifeHereData(28.5383, -81.3792)

    expect(result).toBeNull()
    expect(console.error).toHaveBeenCalledWith(
      'Life Here API request failed:',
      expect.any(Error)
    )
  })
})

describe('buildLocationContext', () => {
  const sampleData: LifeHereData = {
    overallScore: 82,
    label: 'Great',
    profile: 'balanced',
    dining: {
      score: 78,
      restaurantCount: 45,
      topCuisines: ['Italian', 'Mexican'],
      topRated: ['Enzo Table'],
    },
    commute: {
      airportMinutes: 25,
      beachMinutes: 55,
      downtownMinutes: 12,
      themeParkMinutes: 18,
    },
    lifestyle: {
      score: 85,
      gymCount: 8,
      parkCount: 12,
      entertainmentVenues: 6,
    },
    convenience: {
      score: 90,
      nearestGroceryMiles: 0.4,
    },
  }

  it('produces expected string format', () => {
    const result = buildLocationContext(sampleData)

    expect(result).toContain('LOCATION INTELLIGENCE')
    expect(result).toContain('Overall Life Here Score: 82/100 (Great)')
    expect(result).toContain('Profile: balanced')
    expect(result).toContain('Score: 78/100 | 45 restaurants nearby')
    expect(result).toContain('Italian, Mexican')
    expect(result).toContain('Airport: 25 min')
    expect(result).toContain('Beach: 55 min')
    expect(result).toContain('Downtown: 12 min')
    expect(result).toContain('Theme Parks: 18 min')
    expect(result).toContain('8 gyms | 12 parks | 6 entertainment venues')
    expect(result).toContain('Nearest grocery: 0.4 miles')
    expect(result).toContain('END LOCATION INTELLIGENCE')
  })

  it('handles empty cuisine and restaurant arrays', () => {
    const emptyDining: LifeHereData = {
      ...sampleData,
      dining: { score: 0, restaurantCount: 0, topCuisines: [], topRated: [] },
    }

    const result = buildLocationContext(emptyDining)

    expect(result).toContain('Top cuisines: N/A')
    expect(result).toContain('Top rated: N/A')
  })
})
