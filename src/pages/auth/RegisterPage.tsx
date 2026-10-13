import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Brain, ArrowRight, UserPlus, AlertCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { registerSchema, RegisterInput } from '@/lib/validations/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card'

export const RegisterPage: React.FC = () => {
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const [formData, setFormData] = useState<RegisterInput>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [duplicateEmailError, setDuplicateEmailError] = useState(false)
  const [emailSentNotice, setEmailSentNotice] = useState(false)
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }))
    }
    setDuplicateEmailError(false)
    setGeneralError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setDuplicateEmailError(false)
    setGeneralError(null)

    // Form-level validation via Zod
    const validation = registerSchema.safeParse(formData)
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

    const result = await signUp(
      formData.email,
      formData.password,
      formData.fullName,
      formData.phone || undefined
    )

    setIsSubmitting(false)

    if (result.duplicateEmail) {
      // Exact required duplicate email handling
      setDuplicateEmailError(true)
      return
    }

    if (result.emailConfirmationRequired) {
      setEmailSentNotice(true)
      return
    }

    if (result.success) {
      navigate('/dashboard')
    } else {
      setGeneralError(result.error || 'Registration failed. Please check your details and try again.')
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
        <h2 className="text-2xl font-bold text-white tracking-tight">Create your entrepreneur account</h2>
        <p className="mt-1.5 text-xs text-slate-400">
          Begin analyzing business viability with real-time empirical evidence
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Card glass className="border-slate-800">
          <CardHeader>
            <CardTitle>Create Account</CardTitle>
            <CardDescription>Enter your details to establish your business workspace</CardDescription>
          </CardHeader>

          <CardContent>

            {/* Duplicate email registration banner with Login link */}
            {duplicateEmailError && (
              <div
                role="alert"
                className="mb-4 p-4 rounded-xl bg-amber-950/50 border border-amber-800/80 text-amber-200 text-xs flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-white">Account already exists</p>
                  <p>An account with this email already exists. Please log in instead.</p>
                  <div className="pt-1.5">
                    <Link
                      to={`/auth/login?email=${encodeURIComponent(formData.email)}`}
                      className="inline-flex items-center gap-1 font-semibold text-amber-400 hover:text-amber-300 underline underline-offset-2"
                    >
                      Go to Login <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Email verification notice */}
            {emailSentNotice && (
              <div
                role="alert"
                className="mb-4 p-4 rounded-xl bg-blue-950/60 border border-blue-800/80 text-blue-200 text-xs flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-white">Account Created</p>
                  <p>A confirmation email has been sent to <span className="text-white font-medium">{formData.email}</span>. Please verify your email before logging in.</p>
                  <div className="pt-2">
                    <Link
                      to={`/auth/login?email=${encodeURIComponent(formData.email)}`}
                      className="inline-flex items-center gap-1 font-semibold text-blue-400 hover:text-blue-300 underline underline-offset-2"
                    >
                      Proceed to Login <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {generalError && (
              <Alert variant="error" className="mb-4 text-xs" title="Registration Error">
                {generalError}
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
              <Input
                label="Full Name"
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                placeholder="Sarah Connor"
                value={formData.fullName}
                onChange={handleChange}
                error={formErrors.fullName}
                required
              />

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
                label="Phone Number (Optional)"
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                placeholder="+1 (555) 000-0000"
                value={formData.phone}
                onChange={handleChange}
                error={formErrors.phone}
              />

              <Input
                label="Password"
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="At least 8 chars with letters & numbers"
                value={formData.password}
                onChange={handleChange}
                error={formErrors.password}
                required
              />

              <Input
                label="Confirm Password"
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Repeat password"
                value={formData.confirmPassword}
                onChange={handleChange}
                error={formErrors.confirmPassword}
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSubmitting}
                className="w-full mt-3"
                icon={<UserPlus className="w-4 h-4" />}
              >
                Create Account
              </Button>
            </form>
          </CardContent>

          <CardFooter className="justify-center border-t border-slate-800/80 pt-4">
            <p className="text-xs text-slate-400">
              Already have an account?{' '}
              <Link
                to="/auth/login"
                className="font-medium text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1"
              >
                Sign in here <ArrowRight className="w-3 h-3" />
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
