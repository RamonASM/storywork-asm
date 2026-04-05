/**
 * Pre-fetches remote images and converts them to base64 data URIs.
 * Required because Satori cannot load remote URLs during rendering.
 */

function detectMimeType(url: string): string {
  const lower = url.toLowerCase()
  if (lower.includes('.webp')) return 'image/webp'
  if (lower.includes('.png')) return 'image/png'
  return 'image/jpeg'
}

async function fetchAsDataUri(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      return null
    }

    const arrayBuffer = await response.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const mime = detectMimeType(url)

    return `data:${mime};base64,${base64}`
  } catch {
    // Timeout or network error
    return null
  }
}

export async function prefetchPhotos(
  urls: (string | null)[]
): Promise<(string | null)[]> {
  const results = await Promise.all(
    urls.map((url) => {
      if (!url) return Promise.resolve(null)
      return fetchAsDataUri(url)
    })
  )

  return results
}
