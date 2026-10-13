import { z } from 'zod'
import { supabase } from '@/lib/supabase/client'
import { getAppEnv } from '@/lib/env'

export const geminiAnalysisInputSchema = z.object({
  businessTitle: z.string().min(2, 'Business title must be at least 2 characters'),
  category: z.string().min(2, 'Category must be at least 2 characters'),
  objective: z.string().min(2, 'Objective must be at least 2 characters'),
  budget: z.number().nullable().optional(),
  targetLocation: z.string().nullable().optional(),
  targetDemographic: z.string().nullable().optional(),
  searchRadiusMeters: z.number().optional(),
  verifiedEvidence: z
    .object({
      coordinates: z.tuple([z.number(), z.number()]).optional(),
      competitorCount: z.number().optional(),
      sampleCompetitors: z.array(z.string()).optional(),
      sources: z.string().optional(),
      directCompetitorCount: z.number().optional(),
      indirectCompetitorCount: z.number().optional(),
      unverifiedCompetitorCount: z.number().optional(),
      competitorsList: z
        .array(
          z.object({
            name: z.string(),
            type: z.string(),
            address: z.string().optional(),
            distanceKm: z.number().optional(),
            relevance: z.enum(['direct', 'indirect', 'unverified']).optional(),
            relevanceLabel: z.string().optional(),
            relevanceReason: z.string().optional(),
            contactPhone: z.string().optional(),
            website: z.string().optional(),
            sourceId: z.string().optional(),
          })
        )
        .optional(),
      alternativeCandidates: z
        .array(
          z.object({
            areaName: z.string(),
            coordinates: z.tuple([z.number(), z.number()]).optional(),
            competitorCount: z.number(),
            directCompetitorsCount: z.number().optional(),
            indirectCompetitorsCount: z.number().optional(),
            sampleCompetitors: z.array(z.string()).optional(),
          })
        )
        .optional(),
    })
    .optional(),
})

export type GeminiAnalysisInput = z.infer<typeof geminiAnalysisInputSchema>

export interface DirectCompetitorImpactItem {
  competitorName: string
  impactOnVenture: string
  differentiationStrategy: string
}

export interface IndirectCompetitorItem {
  competitorName: string
  category: string
  strategicRelationship: string
}

export interface LocationComparisonItem {
  areaName: string
  coordinates?: [number, number]
  competitorCount: number
  pros: string
  cons: string
  recommendationVerdict: string
  factorsRequiringFieldVerification?: string[]
}

export interface GeminiAnalysisResult {
  executiveSummary: string
  verifiedFacts?: string[]
  locationSuitabilityAnalysis?: string
  directCompetitorAnalysis?: DirectCompetitorImpactItem[]
  indirectCompetitorAnalysis?: IndirectCompetitorItem[]
  keyConsiderations: string[]
  estimatedViabilityScore: number
  evidenceRequired?: string[]
  missingEvidenceGaps?: string[]
  alternativeLocationComparisons?: LocationComparisonItem[]
  strategicNextSteps?: string[]
  provenanceNotes?: string
  timestamp: string
}

/**
 * Gemini Strategic Decision Service
 * Passes real competitor evidence and location parameters to Gemini 3.8 Flash.
 * Uses local Vite proxy during development and Supabase Edge Function in production.
 */
export const geminiService = {
  async generatePreliminaryAnalysis(
    input: GeminiAnalysisInput
  ): Promise<{ data: GeminiAnalysisResult | null; error?: string }> {
    const validation = geminiAnalysisInputSchema.safeParse(input)
    if (!validation.success) {
      return { data: null, error: validation.error.issues?.[0]?.message || 'Invalid input parameters for AI analysis' }
    }

    const { isConfigured } = getAppEnv()
    if (!isConfigured) {
      return {
        data: null,
        error: 'Backend environment is not configured. Please verify your Supabase configuration.',
      }
    }

    try {
      // In local development, use the local Vite dev server endpoint to enable full AI reasoning
      // without encountering browser CORS preflight blocks or waiting for cloud deployments.
      if (import.meta.env.DEV && import.meta.env.MODE !== 'test') {
        try {
          const devRes = await fetch('/api/analyze-business', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(validation.data),
          })

          if (devRes.ok) {
            const devData = await devRes.json()
            if (devData && devData.executiveSummary) {
              return {
                data: {
                  ...devData,
                  evidenceRequired: devData.evidenceRequired || devData.missingEvidenceGaps || [],
                } as GeminiAnalysisResult,
              }
            }
          }
        } catch (devErr) {
          console.warn('Local dev AI analysis endpoint unavailable, falling back to Supabase Edge Function:', devErr)
        }
      }

      const { data, error } = await supabase.functions.invoke('analyze-business', {
        body: validation.data,
      })

      if (error) {
        console.warn('Edge Function execution error:', error.message)
        return {
          data: null,
          error: 'AI Intelligence service is awaiting Edge Function deployment on Supabase. Please deploy analyze-business or run local dev mode.',
        }
      }

      if (!data || !data.executiveSummary) {
        return {
          data: null,
          error: 'AI analysis service returned an unexpected response format.',
        }
      }

      return {
        data: {
          ...data,
          evidenceRequired: data.evidenceRequired || data.missingEvidenceGaps || [],
        } as GeminiAnalysisResult,
      }
    } catch (err: any) {
      return {
        data: null,
        error: err.message || 'AI Intelligence service is temporarily unavailable.',
      }
    }
  },
}
