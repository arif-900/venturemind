/**
 * Business Validation Tests
 *
 * Tests Zod schema rules using deterministic fixtures.
 * No real-world place names, coordinates, or business names are relied upon.
 * Every assertion targets a schema rule, not a specific real-world entity.
 */
import { describe, it, expect } from 'vitest'
import {
  businessRequestSchema,
  BUSINESS_OBJECTIVES,
  CUSTOM_SECTOR_SENTINEL,
  businessCategories,
} from '@/lib/validations/business'

describe('Business Request Validation', () => {
  // ── Passing cases ──────────────────────────────────────────────────────────

  it('accepts a fully specified valid business request', () => {
    const valid = {
      title: 'My Valid Business Venture',
      business_category: 'Food & Beverage / Restaurant',
      description: 'Specialty food concept with clear differentiation.',
      budget: 40000,
      target_location: 'Some City, Some State',
      objective: 'new_launch',
      status: 'draft',
    }
    const result = businessRequestSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('accepts every predefined business category EXCEPT the Others sentinel', () => {
    const nonSentinel = businessCategories.filter((c) => c !== CUSTOM_SECTOR_SENTINEL)
    for (const cat of nonSentinel) {
      const res = businessRequestSchema.safeParse({
        title: `Test for ${cat}`,
        business_category: cat,
        objective: 'new_launch',
      })
      if (!res.success) throw new Error(`Expected category "${cat}" to pass validation`)
      expect(res.success).toBe(true)
    }
  })

  it('accepts a free-text custom sector that is not the sentinel string', () => {
    // This is the value that arrives AFTER the UI resolves customSector → business_category
    const customValues = [
      'Pet Grooming Services',
      'EV Charging Station',
      'Wedding Photography',
      'Laundry & Dry Cleaning',
    ]
    for (const custom of customValues) {
      const res = businessRequestSchema.safeParse({
        title: 'Custom Sector Business',
        business_category: custom,
        objective: 'new_launch',
      })
      if (!res.success) throw new Error(`Expected custom category "${custom}" to pass`)
      expect(res.success).toBe(true)
    }
  })

  it('accepts all defined business objectives', () => {
    for (const obj of BUSINESS_OBJECTIVES) {
      const res = businessRequestSchema.safeParse({
        title: `Venture for ${obj}`,
        business_category: 'Retail & E-commerce',
        objective: obj,
      })
      expect(res.success).toBe(true)
    }
  })

  it('accepts null and omitted budget fields', () => {
    expect(
      businessRequestSchema.safeParse({
        title: 'Budget Test',
        business_category: 'Technology & SaaS',
        budget: null,
        objective: 'expansion',
      }).success
    ).toBe(true)

    expect(
      businessRequestSchema.safeParse({
        title: 'No Budget',
        business_category: 'Technology & SaaS',
        objective: 'expansion',
      }).success
    ).toBe(true)
  })

  // ── Failing cases ──────────────────────────────────────────────────────────

  it('rejects a title shorter than 3 characters', () => {
    const result = businessRequestSchema.safeParse({
      title: 'AB',
      business_category: 'Technology & SaaS',
      objective: 'expansion',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('title'))).toBe(true)
    }
  })

  it('rejects a title longer than 120 characters', () => {
    const result = businessRequestSchema.safeParse({
      title: 'A'.repeat(121),
      business_category: 'Technology & SaaS',
      objective: 'expansion',
    })
    expect(result.success).toBe(false)
  })

  it('rejects a negative budget', () => {
    const result = businessRequestSchema.safeParse({
      title: 'Valid Enterprise Name',
      business_category: 'Technology & SaaS',
      budget: -5000,
      objective: 'expansion',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('budget'))).toBe(true)
    }
  })

  it('rejects an arbitrary unlisted objective', () => {
    const result = businessRequestSchema.safeParse({
      title: 'Valid Enterprise Name',
      business_category: 'Technology & SaaS',
      objective: 'arbitrary_unvalidated_objective',
    })
    expect(result.success).toBe(false)
  })

  it('rejects the bare Others sentinel string as business_category', () => {
    // The sentinel must NEVER reach the DB; UI resolves it to the free-text value first.
    const result = businessRequestSchema.safeParse({
      title: 'Sentinel Test',
      business_category: CUSTOM_SECTOR_SENTINEL,
      objective: 'new_launch',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('business_category'))).toBe(true)
    }
  })

  it('rejects an empty business_category string', () => {
    const result = businessRequestSchema.safeParse({
      title: 'Empty Category Test',
      business_category: '',
      objective: 'new_launch',
    })
    expect(result.success).toBe(false)
  })
})
