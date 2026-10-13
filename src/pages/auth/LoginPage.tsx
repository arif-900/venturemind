import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Brain, ArrowRight, Lock } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { loginSchema, LoginInput } from '@/lib/validations/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card'

export const LoginPage: React.FC = () => {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/dashboard'

  const [formData, setFormData] = useState<LoginInput>({
    email: '',
    password: '',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [authError, setAuthError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }))
    }
    setAuthError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError(null)

    // Validate with Zod
    const validation = loginSchema.safeParse(formData)
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {}
      validation.error.issues.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message
        }
      })
      setFormErrors(fieldErrors)
      return
    }

    setFormErrors({})
    setIsSubmitting(true)

    const result = await signIn(formData.email, formData.password)
    setIsSubmitting(false)

    if (result.success) {
      navigate(redirectTo, { replace: true })
    } else {
      setAuthError(result.error || 'Failed to sign in. Please verify your credentials.')
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <Link to="/" className="inline-flex items-center gap-2.5 mb-4 group">
          <div className="w-10 h-10 rounded-xl brand-gradient flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Brain className="w-5 h-5" />
          </div>
          <span className="font-bold text-xl text-white tracking-tight">VentureMind</span>
        </Link>
        <h2 className="text-2xl font-bold text-white tracking-tight">Sign in to your account</h2>
        <p className="mt-1.5 text-xs text-slate-400">
          Access your business intelligence workspaces and deterministic models
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Card glass className="border-slate-800">
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>Enter your email and password to proceed</CardDescription>
          </CardHeader>

          <CardContent>
            {authError && (
              <Alert variant="error" className="mb-4 text-xs" title="Sign In Notice">
                {authError}
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <Input
                label="Email Address"
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="founder@company.com"
                value={formData.email}
                onChange={handleChange}
                error={formErrors.email}
                required
              />

              <Input
                label="Password"
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                error={formErrors.password}
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSubmitting}
                className="w-full mt-2"
                icon={<Lock className="w-4 h-4" />}
              >
                Sign In
              </Button>
            </form>
          </CardContent>

          <CardFooter className="justify-center border-t border-slate-800/80 pt-4">
            <p className="text-xs text-slate-400">
              Don't have an account?{' '}
              <Link
                to="/auth/register"
                className="font-medium text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1"
              >
                Create one now <ArrowRight className="w-3 h-3" />
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
