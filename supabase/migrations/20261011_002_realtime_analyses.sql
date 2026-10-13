-- VentureMind — Level 2: Real-Time Data & Provenance Persistence
-- Migration: 20261011_002_realtime_analyses.sql
-- Stores only on-demand user-generated evaluation runs and decision dossiers.
-- Does NOT store bulk or permanent POI datasets (satisfies Level 2 Constraint 3 & 4).

CREATE TABLE IF NOT EXISTS public.saved_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_request_id UUID REFERENCES public.business_requests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    analysis_type TEXT NOT NULL, -- 'location_competitors', 'strategic_evaluation', 'financial_runway'
    title TEXT NOT NULL,
    summary TEXT,
    evidence_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    provenance JSONB NOT NULL DEFAULT '{}'::jsonb, -- records source, retrieved_at, license
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_saved_analyses_user_id ON public.saved_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_analyses_business_request_id ON public.saved_analyses(business_request_id);
CREATE INDEX IF NOT EXISTS idx_saved_analyses_created_at ON public.saved_analyses(created_at DESC);

-- Row Level Security (RLS)
ALTER TABLE public.saved_analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own saved analyses" ON public.saved_analyses;
CREATE POLICY "Users can view own saved analyses"
    ON public.saved_analyses
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own saved analyses" ON public.saved_analyses;
CREATE POLICY "Users can insert own saved analyses"
    ON public.saved_analyses
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own saved analyses" ON public.saved_analyses;
CREATE POLICY "Users can delete own saved analyses"
    ON public.saved_analyses
    FOR DELETE
    USING (auth.uid() = user_id);
