import { describe, it, expect } from 'vitest'
import { getAppEnv } from '@/lib/env'
import { businessService } from '@/lib/services/businessService'
import { mapboxService } from '@/lib/services/mapboxService'
import { geminiService } from '@/lib/services/geminiService'

describe('Security & Production Readiness Audit', () => {
  it('strictly isolates server secrets from client environment', () => {
    const env = getAppEnv()

    // Client env must only contain public/anon keys
    expect(env.supabaseUrl).toBeDefined()
    expect(env.supabaseAnonKey).toBeDefined()

    // Verify server-only keys are never exposed on client AppEnv
    expect((env as any).supabaseServiceRoleKey).toBeUndefined()
    expect((env as any).geminiApiKey).toBeUndefined()
    expect((env as any).SERVICE_ROLE_KEY).toBeUndefined()
  })

  it('blocks unauthenticated operations across business service', async () => {
    // Attempt getBusinesses without userId
    const listRes = await businessService.getBusinesses('')
    expect(listRes.data).toEqual([])
    expect(listRes.error).toBe('Authentication required')

    // Attempt getBusinessById without userId
    const getRes = await businessService.getBusinessById('any_id', '')
    expect(getRes.data).toBeNull()
    expect(getRes.error).toBe('Authentication required')

    // Attempt createBusiness without userId
    const createRes = await businessService.createBusiness(
      {
        title: 'Unauthorized Venture',
        business_category: 'Technology & SaaS',
        objective: 'new_launch',
      },
      ''
    )
    expect(createRes.data).toBeNull()
    expect(createRes.error).toBe('Authentication required')

    // Attempt deleteBusiness without userId
    const deleteRes = await businessService.deleteBusiness('any_id', '')
    expect(deleteRes.success).toBe(false)
    expect(deleteRes.error).toBe('Authentication required')
  })

  it('rejects geocoding queries with short or invalid queries', async () => {
    const shortRes = await mapboxService.searchLocation({ query: 'a', limit: 5 })
    expect(shortRes.data).toEqual([])
    expect(shortRes.error).toBe('Search query must be at least 2 characters')
  })

  it('validates AI analysis input and rejects malformed payloads', async () => {
    const invalidRes = await geminiService.generatePreliminaryAnalysis({
      businessTitle: 'A', // too short (< 2)
      category: 'Tech',
      objective: 'Expansion',
    })
    expect(invalidRes.data).toBeNull()
    expect(invalidRes.error).toBe('Business title must be at least 2 characters')
  })
})
