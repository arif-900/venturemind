import { supabase } from '@/lib/supabase/client'
import { getAppEnv } from '@/lib/env'
import {
  businessRequestSchema,
  BusinessRequestInput,
  BusinessRequestRecord,
} from '@/lib/validations/business'

/**
 * Service for managing user-owned business requests
 * Enforces ownership and Zod schema validation directly against Supabase PostgreSQL
 */
export const businessService = {
  /**
   * Fetch all business requests belonging to the authenticated user
   */
  async getBusinesses(userId: string): Promise<{ data: BusinessRequestRecord[]; error?: string }> {
    if (!userId) {
      return { data: [], error: 'Authentication required' }
    }

    const { isConfigured } = getAppEnv()
    if (!isConfigured) {
      return { data: [], error: 'Database service is not configured. Please verify your environment settings.' }
    }

    try {
      // Selecting validated columns, sorted by created_at DESC (supported by index)
      const { data, error } = await supabase
        .from('business_requests')
        .select('id, user_id, title, business_category, description, budget, target_location, objective, status, created_at, updated_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Supabase getBusinesses error:', error)
        return { data: [], error: 'Unable to retrieve business records at this time.' }
      }

      return { data: (data as BusinessRequestRecord[]) || [] }
    } catch (err: any) {
      return { data: [], error: err.message || 'Failed to fetch business requests' }
    }
  },

  /**
   * Fetch a single business request with strict ownership verification
   */
  async getBusinessById(
    id: string,
    userId: string
  ): Promise<{ data: BusinessRequestRecord | null; error?: string; forbidden?: boolean }> {
    if (!userId) {
      return { data: null, error: 'Authentication required' }
    }

    const { isConfigured } = getAppEnv()
    if (!isConfigured) {
      return { data: null, error: 'Database service is not configured. Please verify your environment settings.' }
    }

    try {
      const { data, error } = await supabase
        .from('business_requests')
        .select('id, user_id, title, business_category, description, budget, target_location, objective, status, created_at, updated_at')
        .eq('id', id)
        .maybeSingle()

      if (error) {
        return { data: null, error: 'Unable to load business details.' }
      }

      if (!data) {
        return { data: null, error: 'Business venture not found.' }
      }

      // Strict application + RLS ownership validation
      if (data.user_id !== userId) {
        return {
          data: null,
          error: 'Access denied: You do not have permission to view this resource.',
          forbidden: true,
        }
      }

      return { data: data as BusinessRequestRecord }
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to fetch business venture' }
    }
  },

  /**
   * Create a new business request with Zod validation
   */
  async createBusiness(
    input: BusinessRequestInput,
    userId: string
  ): Promise<{ data: BusinessRequestRecord | null; error?: string }> {
    if (!userId) {
      return { data: null, error: 'Authentication required' }
    }

    // Validate with Zod
    const validation = businessRequestSchema.safeParse(input)
    if (!validation.success) {
      const firstIssue = validation.error.issues?.[0]
      const firstError = firstIssue ? firstIssue.message : 'Validation failed'
      return { data: null, error: firstError }
    }

    const validData = validation.data
    const { isConfigured } = getAppEnv()

    if (!isConfigured) {
      return { data: null, error: 'Database service is not configured. Unable to persist business request.' }
    }

    try {
      const { data, error } = await supabase
        .from('business_requests')
        .insert({
          user_id: userId,
          title: validData.title,
          business_category: validData.business_category,
          description: validData.description || null,
          budget: validData.budget ?? null,
          target_location: validData.target_location || null,
          objective: validData.objective,
          status: validData.status || 'draft',
        })
        .select()
        .single()

      if (error) {
        console.error('Supabase createBusiness error:', error)
        return { data: null, error: 'Failed to save business venture to database.' }
      }

      return { data: data as BusinessRequestRecord }
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to create business request' }
    }
  },

  /**
   * Update an existing business request with strict ownership check and Zod validation
   */
  async updateBusiness(
    id: string,
    input: Partial<BusinessRequestInput>,
    userId: string
  ): Promise<{ data: BusinessRequestRecord | null; error?: string }> {
    if (!userId) return { data: null, error: 'Authentication required' }

    const { isConfigured } = getAppEnv()
    if (!isConfigured) {
      return { data: null, error: 'Database service is not configured.' }
    }

    try {
      const { data, error } = await supabase
        .from('business_requests')
        .update({
          ...(input.title !== undefined && { title: input.title }),
          ...(input.business_category !== undefined && { business_category: input.business_category }),
          ...(input.description !== undefined && { description: input.description || null }),
          ...(input.budget !== undefined && { budget: input.budget ?? null }),
          ...(input.target_location !== undefined && { target_location: input.target_location || null }),
          ...(input.objective !== undefined && { objective: input.objective }),
          ...(input.status !== undefined && { status: input.status }),
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        console.error('Supabase updateBusiness error:', error)
        return { data: null, error: 'Failed to update business venture.' }
      }

      return { data: data as BusinessRequestRecord }
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to update business request' }
    }
  },

  /**
   * Delete a business request with strict ownership check
   */
  async deleteBusiness(
    id: string,
    userId: string
  ): Promise<{ success: boolean; error?: string; forbidden?: boolean }> {
    if (!userId) {
      return { success: false, error: 'Authentication required' }
    }

    // Verify ownership first
    const check = await this.getBusinessById(id, userId)
    if (check.forbidden) {
      return { success: false, error: check.error, forbidden: true }
    }
    if (!check.data) {
      return { success: false, error: 'Business request not found' }
    }

    const { isConfigured } = getAppEnv()
    if (!isConfigured) {
      return { success: false, error: 'Database service is not configured.' }
    }

    try {
      const { error } = await supabase
        .from('business_requests')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

      if (error) {
        return { success: false, error: 'Unable to remove business venture.' }
      }

      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to delete business request' }
    }
  },
}
