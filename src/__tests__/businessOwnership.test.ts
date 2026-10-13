import { describe, it, expect, vi, beforeEach } from 'vitest'
import { businessService } from '@/lib/services/businessService'

// Mock Supabase to test ownership and RLS boundary logic deterministically
vi.mock('@/lib/supabase/client', () => {
  const store: Record<string, any> = {}

  return {
    supabase: {
      from: vi.fn((_table: string) => ({
        select: vi.fn(() => ({
          eq: vi.fn((col: string, val: string) => {
            if (col === 'id') {
              const record = store[val]
              return {
                maybeSingle: vi.fn(async () => ({ data: record || null, error: null })),
              }
            }
            if (col === 'user_id') {
              const records = Object.values(store).filter((r: any) => r.user_id === val)
              return {
                order: vi.fn(() => ({
                  data: records,
                  error: null,
                })),
              }
            }
            return { maybeSingle: vi.fn(async () => ({ data: null, error: null })) }
          }),
        })),
        insert: vi.fn((payload: any) => ({
          select: vi.fn(() => ({
            single: vi.fn(async () => {
              const id = 'biz_' + Math.random().toString(36).substring(2, 9)
              const record = { id, ...payload, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
              store[id] = record
              return { data: record, error: null }
            }),
          })),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn((col1: string, val1: string) => ({
            eq: vi.fn((col2: string, val2: string) => {
              if (store[val1] && store[val1].user_id === val2) {
                delete store[val1]
                return { error: null }
              }
              return { error: { message: 'Row not found or unauthorized' } }
            }),
          })),
        })),
      })),
    },
  }
})

describe('Resource Ownership & RLS Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows owner to access their own business request', async () => {
    const ownerId = 'd8e8749f-b98e-4a6c-9419-4bb426d5a1b3'
    const createRes = await businessService.createBusiness(
      {
        title: 'Alpha Logistics Tech',
        business_category: 'Technology & SaaS',
        objective: 'new_launch',
      },
      ownerId
    )

    expect(createRes.data).toBeDefined()
    const businessId = createRes.data!.id

    const fetchRes = await businessService.getBusinessById(businessId, ownerId)
    expect(fetchRes.data).toBeDefined()
    expect(fetchRes.data?.id).toBe(businessId)
    expect(fetchRes.forbidden).toBeUndefined()
  })

  it('denies access (403 Forbidden) when user attempts to access another user business', async () => {
    const ownerId = 'd8e8749f-b98e-4a6c-9419-4bb426d5a1b3'
    const attackerId = 'e2b3c4d5-e6f7-4a8b-9c0d-1e2f3a4b5c6d'

    const createRes = await businessService.createBusiness(
      {
        title: 'Alpha Private Financials',
        business_category: 'Professional Services',
        objective: 'profitability',
      },
      ownerId
    )

    const businessId = createRes.data!.id

    // User Beta attempts to read User Alpha's record
    const accessAttempt = await businessService.getBusinessById(businessId, attackerId)
    expect(accessAttempt.data).toBeNull()
    expect(accessAttempt.forbidden).toBe(true)
    expect(accessAttempt.error).toContain('Access denied')
  })

  it('prevents unauthorized user from deleting another user business', async () => {
    const ownerId = 'd8e8749f-b98e-4a6c-9419-4bb426d5a1b3'
    const attackerId = 'e2b3c4d5-e6f7-4a8b-9c0d-1e2f3a4b5c6d'

    const createRes = await businessService.createBusiness(
      {
        title: 'Alpha Mission Critical',
        business_category: 'Manufacturing & Logistics',
        objective: 'expansion',
      },
      ownerId
    )

    const businessId = createRes.data!.id

    // User Beta attempts to delete User Alpha's record
    const deleteAttempt = await businessService.deleteBusiness(businessId, attackerId)
    expect(deleteAttempt.success).toBe(false)
    expect(deleteAttempt.forbidden).toBe(true)

    // Verify record still exists for Owner
    const verifyExists = await businessService.getBusinessById(businessId, ownerId)
    expect(verifyExists.data).not.toBeNull()
  })
})
