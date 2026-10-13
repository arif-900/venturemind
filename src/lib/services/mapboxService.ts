import { z } from 'zod'
import { getAppEnv } from '@/lib/env'

export const locationSearchSchema = z.object({
  query: z.string().min(2, 'Search query must be at least 2 characters'),
  limit: z.number().min(1).max(10).default(5),
})

export type LocationSearchInput = z.infer<typeof locationSearchSchema>

export interface GeocodingResult {
  id: string
  placeName: string
  coordinates: [number, number] // [lng, lat]
  placeType: string[]
}

/**
 * Mapbox Service Boundary
 * - Parameter and coordinate validation
 * - Enforces real geocoding via Mapbox API with proper attribution
 * - Handles API failures and missing credentials without synthetic data
 */
export const mapboxService = {
  async searchLocation(
    input: LocationSearchInput
  ): Promise<{ data: GeocodingResult[]; error?: string; notice?: string; attribution?: string }> {
    const validation = locationSearchSchema.safeParse(input)
    if (!validation.success) {
      return { data: [], error: validation.error.issues?.[0]?.message || 'Invalid search query' }
    }

    const { query, limit } = validation.data
    const { mapboxToken } = getAppEnv()

    if (!mapboxToken || mapboxToken.startsWith('pk.your') || mapboxToken.includes('placeholder')) {
      return {
        data: [],
        error: 'Location intelligence service requires a valid Mapbox access token configured in environment settings.',
      }
    }

    try {
      const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        query
      )}.json?access_token=${mapboxToken}&limit=${limit}`

      const res = await fetch(endpoint)
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          return { data: [], error: 'Invalid or restricted Mapbox token. Please verify permissions.' }
        }
        return { data: [], error: 'Unable to complete location verification at this time.' }
      }

      const json = await res.json()
      const results: GeocodingResult[] = (json.features || []).map((f: any) => ({
        id: f.id,
        placeName: f.place_name,
        coordinates: f.center,
        placeType: f.place_type || ['locality'],
      }))

      return {
        data: results,
        notice: results.length === 0 ? 'No matching commercial territories found for this query.' : undefined,
        attribution: json.attribution || '© Mapbox © OpenStreetMap',
      }
    } catch (err: any) {
      return { data: [], error: err.message || 'Location verification request failed' }
    }
  },
}
