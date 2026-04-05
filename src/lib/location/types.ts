export type LifeHereData = {
  overallScore: number
  label: string
  profile: string
  dining: {
    score: number
    restaurantCount: number
    topCuisines: string[]
    topRated: string[]
  }
  commute: {
    airportMinutes: number
    beachMinutes: number
    downtownMinutes: number
    themeParkMinutes: number
  }
  lifestyle: {
    score: number
    gymCount: number
    parkCount: number
    entertainmentVenues: number
  }
  convenience: {
    score: number
    nearestGroceryMiles: number
  }
}

export type GeocodedLocation = {
  lat: number
  lng: number
  formattedAddress: string
}
