import React, { createContext, useEffect, useState, useCallback, useMemo } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { getAppEnv } from '@/lib/env'

export interface UserProfile {
  id: string
  auth_user_id: string
  full_name: string | null
  phone: string | null
  role: 'entrepreneur' | 'advisor' | 'investor'
  created_at: string
  updated_at: string
}

export interface SignUpResult {
  success: boolean
  duplicateEmail?: boolean
  emailConfirmationRequired?: boolean
  error?: string
}

export interface SignInResult {
  success: boolean
  error?: string
}

export interface SignOutResult {
  success: boolean
  error?: string
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  loading: boolean
  isConfigured: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<SignInResult>
  signUp: (email: string, password: string, fullName: string, phone?: string) => Promise<SignUpResult>
  signOut: () => Promise<SignOutResult>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const { isConfigured } = useMemo(() => getAppEnv(), [])

  // Fetch or upsert user profile in Supabase
  const fetchProfile = useCallback(async (userId: string, defaultName?: string) => {
    if (!isConfigured || !userId) return

    try {
      const { data, error: profileErr } = await supabase
        .from('profiles')
        .select('id, auth_user_id, full_name, phone, role, created_at, updated_at')
        .eq('auth_user_id', userId)
        .maybeSingle()

      if (!profileErr && data) {
        setProfile(data as UserProfile)
        return
      }

      // If profile does not exist yet (e.g. database trigger delay or email confirmation), upsert
      const { data: upserted, error: upsertErr } = await supabase
        .from('profiles')
        .upsert(
          {
            auth_user_id: userId,
            full_name: defaultName || 'Entrepreneur',
            phone: null,
            role: 'entrepreneur',
          },
          { onConflict: 'auth_user_id' }
        )
        .select()
        .maybeSingle()

      if (!upsertErr && upserted) {
        setProfile(upserted as UserProfile)
      }
    } catch (err) {
      console.error('Error fetching/upserting profile in database:', err)
    }
  }, [isConfigured])

  // Initial session check and Supabase auth state listener
  useEffect(() => {
    let mounted = true

    async function initAuth() {
      if (!isConfigured) {
        // Without active Supabase configuration, no authentication or session is authorized
        if (mounted) setLoading(false)
        return
      }

      try {
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) {
          console.warn('Session retrieval error:', sessionError.message)
        }

        if (mounted) {
          setSession(initialSession)
          setUser(initialSession?.user || null)
          if (initialSession?.user) {
            await fetchProfile(initialSession.user.id)
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    initAuth()

    if (!isConfigured) return

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return

      setSession(newSession)
      setUser(newSession?.user || null)

      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') && newSession?.user) {
        await fetchProfile(newSession.user.id)
      } else if (event === 'SIGNED_OUT') {
        setProfile(null)
        setUser(null)
        setSession(null)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [isConfigured, fetchProfile])

  // Sign In - strictly executes real Supabase authentication
  const signIn = useCallback(async (email: string, password: string): Promise<SignInResult> => {
    setError(null)
    setLoading(true)

    if (!isConfigured) {
      const msg = 'Authentication service is not configured. Please configure your environment settings.'
      setError(msg)
      setLoading(false)
      return { success: false, error: msg }
    }

    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (authErr) {
        const errMsg = authErr.message || ''
        let friendly = errMsg

        if (errMsg.toLowerCase().includes('invalid login credentials') || authErr.status === 400) {
          friendly = 'Invalid email or password. Please verify your credentials and try again.'
        } else if (errMsg.toLowerCase().includes('email not confirmed')) {
          friendly = 'Your email address has not been confirmed yet. Please check your inbox for the confirmation link.'
        }

        setError(friendly)
        setLoading(false)
        return { success: false, error: friendly }
      }

      setUser(data.user)
      setSession(data.session)
      if (data.user) {
        await fetchProfile(data.user.id)
      }
      setLoading(false)
      return { success: true }
    } catch (err: any) {
      const msg = err.message || 'An unexpected error occurred during sign in'
      setError(msg)
      setLoading(false)
      return { success: false, error: msg }
    }
  }, [isConfigured, fetchProfile])

  // Sign Up - strictly executes real Supabase registration & duplicate detection
  const signUp = useCallback(async (
    email: string,
    password: string,
    fullName: string,
    phone?: string
  ): Promise<SignUpResult> => {
    setError(null)
    setLoading(true)

    if (!isConfigured) {
      const msg = 'Registration service is not configured. Please configure your environment settings.'
      setError(msg)
      setLoading(false)
      return { success: false, error: msg }
    }

    try {
      const { data, error: authErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone ? phone.trim() : null,
          },
        },
      })

      if (authErr) {
        const lowerMsg = (authErr.message || '').toLowerCase()
        const isDuplicate =
          lowerMsg.includes('already registered') ||
          lowerMsg.includes('already in use') ||
          lowerMsg.includes('email address is already in use')

        if (isDuplicate) {
          setLoading(false)
          return {
            success: false,
            duplicateEmail: true,
            error: 'An account with this email already exists. Please log in instead.',
          }
        }

        if (lowerMsg.includes('rate limit') || authErr.status === 429) {
          setLoading(false)
          return {
            success: false,
            error: 'Too many registration attempts. Please wait a few moments and try again.',
          }
        }

        if (lowerMsg.includes('is invalid') || (authErr as any).code === 'email_address_invalid') {
          setLoading(false)
          return {
            success: false,
            error: 'Please provide a valid, deliverable email address (e.g., yourname@gmail.com).',
          }
        }

        setError(authErr.message)
        setLoading(false)
        return { success: false, error: authErr.message }
      }

      // Supabase Email Enumeration Protection:
      // When enabled, Supabase returns user with empty identities [] for duplicate registration
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        setLoading(false)
        return {
          success: false,
          duplicateEmail: true,
          error: 'An account with this email already exists. Please log in instead.',
        }
      }

      // Check if email confirmation is required by Supabase (no active session created yet)
      if (data.user && !data.session) {
        setLoading(false)
        return {
          success: true,
          emailConfirmationRequired: true,
        }
      }

      setUser(data.user)
      setSession(data.session)
      if (data.user) {
        await fetchProfile(data.user.id, fullName)
      }

      setLoading(false)
      return { success: true }
    } catch (err: any) {
      const msg = err.message || 'An unexpected error occurred during registration'
      setError(msg)
      setLoading(false)
      return { success: false, error: msg }
    }
  }, [isConfigured, fetchProfile])

  // Sign Out - cleans state, calls Supabase signOut, and clears local tokens
  const signOut = useCallback(async (): Promise<SignOutResult> => {
    setLoading(true)

    try {
      localStorage.removeItem('venturemind-auth-token')
      sessionStorage.clear()
    } catch (storageErr) {
      console.warn('Storage cleanup notice:', storageErr)
    }

    if (!isConfigured) {
      setUser(null)
      setSession(null)
      setProfile(null)
      setLoading(false)
      return { success: true }
    }

    try {
      const { error: signOutErr } = await supabase.auth.signOut()
      if (signOutErr) {
        console.error('Sign out error:', signOutErr)
        setLoading(false)
        return { success: false, error: signOutErr.message }
      }

      setUser(null)
      setSession(null)
      setProfile(null)
      setLoading(false)
      return { success: true }
    } catch (err: any) {
      console.error('Unexpected error signing out:', err)
      setLoading(false)
      return { success: false, error: err.message || 'Failed to sign out' }
    }
  }, [isConfigured])

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id, user.user_metadata?.full_name)
    }
  }, [user, fetchProfile])

  const value = useMemo(
    () => ({
      user,
      session,
      profile,
      loading,
      isConfigured,
      error,
      signIn,
      signUp,
      signOut,
      refreshProfile,
    }),
    [user, session, profile, loading, isConfigured, error, signIn, signUp, signOut, refreshProfile]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { AuthContext }
export { useAuth } from './useAuth'
