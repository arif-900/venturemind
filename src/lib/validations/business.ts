import { z } from 'zod'

export const BUSINESS_OBJECTIVES = [
  'new_launch',
  'expansion',
  'profitability',
  'market_research',
  'cost_reduction',
  'operational_efficiency',
] as const

export const BUSINESS_STATUSES = [
  'draft',
  'submitted',
  'in_review',
  'analyzed',
  'archived',
] as const

export const businessCategories = [
  'Retail & E-commerce',
  'Food & Beverage / Restaurant',
  'Technology & SaaS',
  'Healthcare & Wellness',
  'Professional Services',
  'Real Estate & Construction',
  'Manufacturing & Logistics',
  'Education & Training',
  'Hospitality & Tourism',
  'Others',
] as const

/**
 * The sentinel value used to signal that the user wants a custom/free-text sector.
 * Components that show a business category dropdown must render an additional text
 * input whenever this value is selected.
 */
export const CUSTOM_SECTOR_SENTINEL = 'Others' as const

export const businessRequestSchema = z.object({
  title: z
    .string()
    .min(3, 'Business title must be at least 3 characters')
    .max(120, 'Business title cannot exceed 120 characters'),
  business_category: z
    .string()
    .min(2, 'Business category must be at least 2 characters')
    .max(120, 'Business category cannot exceed 120 characters')
    .refine(
      (val) => val !== CUSTOM_SECTOR_SENTINEL,
      "Select 'Others' and then type your specific sector in the field that appears below the dropdown."
    ),
  description: z.string().max(1000, 'Description cannot exceed 1000 characters').optional().or(z.literal('')),
  budget: z
    .number()
    .min(0, 'Budget cannot be negative')
    .optional()
    .nullable(),
  target_location: z.string().max(150, 'Location cannot exceed 150 characters').optional().or(z.literal('')),
  objective: z.enum(BUSINESS_OBJECTIVES),
  status: z.enum(BUSINESS_STATUSES).default('draft').optional(),
})

export type BusinessRequestInput = z.infer<typeof businessRequestSchema>

export interface BusinessRequestRecord {
  id: string
  user_id: string
  title: string
  business_category: string
  description?: string | null
  budget?: number | null
  target_location?: string | null
  objective: typeof BUSINESS_OBJECTIVES[number]
  status: typeof BUSINESS_STATUSES[number]
  created_at: string
  updated_at: string
}
