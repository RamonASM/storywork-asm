import type { LifeHereData } from './types'

/**
 * Fetch Life Here location intelligence from the ASM Portal API.
 * Returns null on any failure (missing env vars, network error, bad response).
 */
export async function fetchLifeHereData(
  lat: number,
  lng: number,
  profile: string = 'balanced'
): Promise<LifeHereData | null> {
  const portalUrl = process.env.ASM_PORTAL_URL
  const secret = process.env.ASM_LIFE_HERE_SECRET

  if (!portalUrl || !secret) {
    console.warn('Life Here integration not configured: missing ASM_PORTAL_URL or ASM_LIFE_HERE_SECRET')
    return null
  }

  const url = `${portalUrl}/api/v1/location/scores?lat=${lat}&lng=${lng}&profile=${profile}`

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-ASM-Secret': secret,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      console.error(`Life Here API returned ${response.status}`)
      return null
    }

    const json = await response.json()

    const data: LifeHereData = {
      overallScore: json.overallScore ?? json.overall_score ?? 0,
      label: json.label ?? '',
      profile: json.profile ?? profile,
      dining: {
        score: json.dining?.score ?? 0,
        restaurantCount: json.dining?.restaurantCount ?? json.dining?.restaurant_count ?? 0,
        topCuisines: json.dining?.topCuisines ?? json.dining?.top_cuisines ?? [],
        topRated: json.dining?.topRated ?? json.dining?.top_rated ?? [],
      },
      commute: {
        airportMinutes: json.commute?.airportMinutes ?? json.commute?.airport_minutes ?? 0,
        beachMinutes: json.commute?.beachMinutes ?? json.commute?.beach_minutes ?? 0,
        downtownMinutes: json.commute?.downtownMinutes ?? json.commute?.downtown_minutes ?? 0,
        themeParkMinutes: json.commute?.themeParkMinutes ?? json.commute?.theme_park_minutes ?? 0,
      },
      lifestyle: {
        score: json.lifestyle?.score ?? 0,
        gymCount: json.lifestyle?.gymCount ?? json.lifestyle?.gym_count ?? 0,
        parkCount: json.lifestyle?.parkCount ?? json.lifestyle?.park_count ?? 0,
        entertainmentVenues: json.lifestyle?.entertainmentVenues ?? json.lifestyle?.entertainment_venues ?? 0,
      },
      convenience: {
        score: json.convenience?.score ?? 0,
        nearestGroceryMiles: json.convenience?.nearestGroceryMiles ?? json.convenience?.nearest_grocery_miles ?? 0,
      },
    }

    return data
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.error('Life Here API request timed out')
    } else {
      console.error('Life Here API request failed:', error)
    }
    return null
  }
}

/**
 * Build a prompt-friendly text block from Life Here data for AI context injection.
 */
export function buildLocationContext(data: LifeHereData): string {
  const lines: string[] = [
    '--- LOCATION INTELLIGENCE (Life Here Data) ---',
    `Overall Life Here Score: ${data.overallScore}/100 (${data.label})`,
    `Profile: ${data.profile}`,
    '',
    'Dining:',
    `  Score: ${data.dining.score}/100 | ${data.dining.restaurantCount} restaurants nearby`,
    `  Top cuisines: ${data.dining.topCuisines.join(', ') || 'N/A'}`,
    `  Top rated: ${data.dining.topRated.join(', ') || 'N/A'}`,
    '',
    'Commute Times:',
    `  Airport: ${data.commute.airportMinutes} min`,
    `  Beach: ${data.commute.beachMinutes} min`,
    `  Downtown: ${data.commute.downtownMinutes} min`,
    `  Theme Parks: ${data.commute.themeParkMinutes} min`,
    '',
    'Lifestyle:',
    `  Score: ${data.lifestyle.score}/100`,
    `  ${data.lifestyle.gymCount} gyms | ${data.lifestyle.parkCount} parks | ${data.lifestyle.entertainmentVenues} entertainment venues`,
    '',
    'Convenience:',
    `  Score: ${data.convenience.score}/100`,
    `  Nearest grocery: ${data.convenience.nearestGroceryMiles} miles`,
    '--- END LOCATION INTELLIGENCE ---',
  ]

  return lines.join('\n')
}
