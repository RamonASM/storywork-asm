import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { prefetchPhotos } from './photo-prefetch'

describe('prefetchPhotos', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('converts URL to base64 data URI with correct mime type', async () => {
    const fakeImageData = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
    const expectedBase64 = Buffer.from(fakeImageData).toString('base64')

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(fakeImageData.buffer),
    })

    const result = await prefetchPhotos(['https://cdn.example.com/photo.jpg'])
    expect(result).toHaveLength(1)
    expect(result[0]).toBe(`data:image/jpeg;base64,${expectedBase64}`)
  })

  it('detects webp mime type from URL', async () => {
    const fakeData = new Uint8Array([1, 2, 3])
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(fakeData.buffer),
    })

    const result = await prefetchPhotos(['https://cdn.example.com/image.webp'])
    expect(result[0]).toMatch(/^data:image\/webp;base64,/)
  })

  it('detects png mime type from URL', async () => {
    const fakeData = new Uint8Array([1, 2, 3])
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(fakeData.buffer),
    })

    const result = await prefetchPhotos(['https://cdn.example.com/image.png'])
    expect(result[0]).toMatch(/^data:image\/png;base64,/)
  })

  it('returns null for failed fetches (ok: false)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    })

    const result = await prefetchPhotos(['https://cdn.example.com/missing.jpg'])
    expect(result).toEqual([null])
  })

  it('returns null for fetch errors (network failure)', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const result = await prefetchPhotos(['https://cdn.example.com/photo.jpg'])
    expect(result).toEqual([null])
  })

  it('returns null for timeouts', async () => {
    global.fetch = vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError'))

    const result = await prefetchPhotos(['https://cdn.example.com/slow.jpg'])
    expect(result).toEqual([null])
  })

  it('passes through null inputs', async () => {
    global.fetch = vi.fn()

    const result = await prefetchPhotos([null, null])
    expect(result).toEqual([null, null])
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('fetches all photos in parallel', async () => {
    const fakeData = new Uint8Array([1, 2, 3])
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(fakeData.buffer),
    })

    const urls = [
      'https://cdn.example.com/a.jpg',
      'https://cdn.example.com/b.png',
      'https://cdn.example.com/c.webp',
    ]

    const result = await prefetchPhotos(urls)
    expect(result).toHaveLength(3)
    expect(result.every((r) => r !== null)).toBe(true)
    expect(global.fetch).toHaveBeenCalledTimes(3)
  })

  it('handles mix of successful and failed fetches', async () => {
    const fakeData = new Uint8Array([1, 2, 3])

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(fakeData.buffer),
      })
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(fakeData.buffer),
      })

    const result = await prefetchPhotos([
      'https://cdn.example.com/a.jpg',
      'https://cdn.example.com/b.jpg',
      'https://cdn.example.com/c.jpg',
    ])

    expect(result[0]).not.toBeNull()
    expect(result[1]).toBeNull()
    expect(result[2]).not.toBeNull()
  })
})
