import { describe, it, expect } from 'vitest'
import { getAppEnv, validateClientEnv } from '@/lib/env'

describe('Environment Variable Security & Validation', () => {
  it('safely extracts client environment without crashing when keys are missing', () => {
    const env = getAppEnv()
    expect(env).toBeDefined()
    expect(typeof env.isConfigured).toBe('boolean')
    expect(typeof env.supabaseUrl).toBe('string')
    expect(typeof env.supabaseAnonKey).toBe('string')
    expect(typeof env.mapboxToken).toBe('string')
  })

  it('validates client environment and identifies missing keys cleanly', () => {
    const result = validateClientEnv()
    expect(result).toHaveProperty('valid')
    expect(result).toHaveProperty('missing')
    expect(Array.isArray(result.missing)).toBe(true)
  })

  it('ensures secret server keys are NEVER bundled into client env object', () => {
    const env = getAppEnv()
    // Ensure SUPABASE_SERVICE_ROLE_KEY and GEMINI_API_KEY are absent from client bundle object
    expect((env as any).supabaseServiceRoleKey).toBeUndefined()
    expect((env as any).geminiApiKey).toBeUndefined()
  })
})
