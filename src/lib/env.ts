/**
 * Safe Environment Variable Management for VentureMind
 * Validates configuration and prevents secret exposure.
 */

export interface AppEnv {
  supabaseUrl: string
  supabaseAnonKey: string
  mapboxToken: string
  isConfigured: boolean
}

function getClientEnv(key: string, fallbackKey?: string): string {
  // Vite exposes env variables via import.meta.env
  const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : {}
  const val = metaEnv?.[key] || (fallbackKey ? metaEnv?.[fallbackKey] : undefined) || ''
  return typeof val === 'string' ? val.trim() : ''
}

export function getAppEnv(): AppEnv {
  const supabaseUrl = getClientEnv('VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL')
  const supabaseAnonKey = getClientEnv('VITE_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY')
  const mapboxToken = getClientEnv('VITE_MAPBOX_TOKEN', 'NEXT_PUBLIC_MAPBOX_TOKEN')

  const isConfigured = Boolean(
    supabaseUrl &&
    supabaseUrl.startsWith('https://') &&
    supabaseUrl !== 'https://xyzcompany.supabase.co' &&
    supabaseUrl !== 'https://your-project-id.supabase.co' &&
    supabaseAnonKey &&
    supabaseAnonKey !== 'your-anon-key-here' &&
    !supabaseAnonKey.includes('placeholder')
  )

  return {
    supabaseUrl,
    supabaseAnonKey,
    mapboxToken,
    isConfigured,
  }
}

/**
 * Validate required environment variables
 * Throws a clean, helpful error if mandatory client keys are missing
 */
export function validateClientEnv(): { valid: boolean; missing: string[] } {
  const env = getAppEnv()
  const missing: string[] = []

  if (!env.supabaseUrl) {
    missing.push('VITE_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL')
  }
  if (!env.supabaseAnonKey) {
    missing.push('VITE_SUPABASE_ANON_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  return {
    valid: missing.length === 0,
    missing,
  }
}
