-- VentureMind — Level 1: Foundation Database Schema & Security Policies
-- Migration: 20261011_001_initial_schema.sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create custom enum types for constrained values
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('entrepreneur', 'advisor', 'investor');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE business_request_status AS ENUM ('draft', 'submitted', 'in_review', 'analyzed', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    phone TEXT,
    role user_role NOT NULL DEFAULT 'entrepreneur',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Performance Indexes on Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON public.profiles(auth_user_id);

-- 3. Business Requests Table
CREATE TABLE IF NOT EXISTS public.business_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    business_category TEXT NOT NULL,
    description TEXT,
    budget NUMERIC(15, 2),
    target_location TEXT,
    objective TEXT NOT NULL,
    status business_request_status NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    
    -- Constraint on validated business objective
    CONSTRAINT chk_business_objective CHECK (
        objective IN ('expansion', 'new_launch', 'profitability', 'market_research', 'cost_reduction', 'operational_efficiency')
    ),
    -- Constraint on non-negative budget
    CONSTRAINT chk_business_budget CHECK (
        budget IS NULL OR budget >= 0
    )
);

-- Performance Indexes on Business Requests
CREATE INDEX IF NOT EXISTS idx_business_requests_user_id ON public.business_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_business_requests_created_at ON public.business_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_business_requests_status ON public.business_requests(status);

-- 4. Automatic updated_at Trigger Function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_business_requests_updated_at ON public.business_requests;
CREATE TRIGGER set_business_requests_updated_at
    BEFORE UPDATE ON public.business_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 5. Safe Profile Creation Mechanism on User Signup
-- Handled with exception safety to prevent signup failures if profile creation encounters a conflict
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (auth_user_id, full_name, phone, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
        'entrepreneur'::user_role
    )
    ON CONFLICT (auth_user_id) DO NOTHING;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log failure internally without aborting the auth.users signup transaction
        RAISE WARNING 'Profile creation trigger failed for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 6. Row Level Security (RLS) Configuration
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_requests ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = auth_user_id)
    WITH CHECK (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
    ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = auth_user_id);

-- Business Requests Policies
DROP POLICY IF EXISTS "Users can view own business requests" ON public.business_requests;
CREATE POLICY "Users can view own business requests"
    ON public.business_requests
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own business requests" ON public.business_requests;
CREATE POLICY "Users can insert own business requests"
    ON public.business_requests
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own business requests" ON public.business_requests;
CREATE POLICY "Users can update own business requests"
    ON public.business_requests
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own business requests" ON public.business_requests;
CREATE POLICY "Users can delete own business requests"
    ON public.business_requests
    FOR DELETE
    USING (auth.uid() = user_id);
