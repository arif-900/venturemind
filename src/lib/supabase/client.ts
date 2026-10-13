import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { getAppEnv } from '@/lib/env'

let supabaseInstance: SupabaseClient | null = null

/**
 * Creates or retrieves the singleton Supabase client
 * Configured with auto-refresh and persistent storage
 */
export function getSupabaseClient(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance
  }

  const { supabaseUrl, supabaseAnonKey } = getAppEnv()

  // Fallback placeholder URL for initial dev mode before credentials are configured
  const url = supabaseUrl || 'https://placeholder.supabase.co'
  const anonKey = supabaseAnonKey || 'placeholder-anon-key'

  supabaseInstance = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'venturemind-auth-token',
    },
  })

  return supabaseInstance
}

export const supabase = getSupabaseClient()
