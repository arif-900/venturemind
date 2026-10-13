import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Briefcase, ArrowLeft, PlusCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import {
  businessRequestSchema,
  BusinessRequestInput,
  businessCategories,
  BUSINESS_OBJECTIVES,
  CUSTOM_SECTOR_SENTINEL,
} from '@/lib/validations/business'
import { businessService } from '@/lib/services/businessService'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'

export const NewBusinessPage: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [formData, setFormData] = useState<BusinessRequestInput>({
    title: '',
    business_category: businessCategories[0],
    description: '',
    budget: null,
    target_location: '',
    objective: 'new_launch',
    status: 'draft',
  })

  // Custom sector state — only relevant when business_category === CUSTOM_SECTOR_SENTINEL
  const [customSector, setCustomSector] = useState('')
  const [customSectorError, setCustomSectorError] = useState<string | null>(null)

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    if (name === 'budget') {
      const num = value === '' ? null : parseFloat(value)
      setFormData((prev) => ({ ...prev, budget: isNaN(num as number) ? null : num }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }

    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSubmitError(null)

    // Validate custom sector if 'Others' was chosen
    if (formData.business_category === CUSTOM_SECTOR_SENTINEL) {
      if (!customSector.trim()) {
        setCustomSectorError('Please enter your specific business sector.')
        return
      }
      setCustomSectorError(null)
    }

    // Resolve the actual sector value to persist: use free-text if Others was chosen
    const resolvedCategory =
      formData.business_category === CUSTOM_SECTOR_SENTINEL
        ? customSector.trim()
        : formData.business_category

    const submitData: BusinessRequestInput = {
      ...formData,
      business_category: resolvedCategory,
    }

    // Validate with Zod (using a relaxed schema for the category since it's now a free string)
    const validation = businessRequestSchema.safeParse(submitData)
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

    const res = await businessService.createBusiness(validation.data, user.id)
    setIsSubmitting(false)

    if (res.data) {
      navigate(`/dashboard/business/${res.data.id}`)
    } else {
      setSubmitError(res.error || 'Failed to create business request')
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3 pb-2">
        <Link to="/dashboard">
          <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Create Business Project</h1>
          <p className="text-xs text-slate-400">
            Enter your business idea, starting capital, target location, and goals to start analyzing
          </p>
        </div>
      </div>

      {submitError && (
        <Alert variant="error" title="Submission Error">
          {submitError}
        </Alert>
      )}

      <Card glass className="border-slate-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-950/60 border border-indigo-800/40 text-indigo-400">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <CardTitle>Project Details</CardTitle>
              <CardDescription>
                Your business plans and financial details are kept strictly confidential and private to your account
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              label="Business Title *"
              id="title"
              name="title"
              placeholder="e.g. Apex Artisanal Coffee & Roastery"
              value={formData.title}
              onChange={handleChange}
              error={formErrors.title}
              helperText="Descriptive name for this initiative (3-120 chars)"
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 text-left">
                <label
                  htmlFor="business_category"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
                >
                  Industry Category *
                </label>
                <select
                  id="business_category"
                  name="business_category"
                  value={formData.business_category}
                  onChange={(e) => {
                    handleChange(e)
                    setCustomSectorError(null)
                  }}
                  className="w-full rounded-lg bg-slate-900/80 border border-slate-800 px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  {businessCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                {formErrors.business_category && (
                  <p className="text-xs text-rose-400">{formErrors.business_category}</p>
                )}
              </div>

              <div className="space-y-1.5 text-left">
                <label
                  htmlFor="objective"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
                >
                  Business Objective *
                </label>
                <select
                  id="objective"
                  name="objective"
                  value={formData.objective}
                  onChange={handleChange}
                  className="w-full rounded-lg bg-slate-900/80 border border-slate-800 px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors capitalize"
                >
                  {BUSINESS_OBJECTIVES.map((obj) => (
                    <option key={obj} value={obj}>
                      {obj.replace('_', ' ')}
                    </option>
                  ))}
                </select>
                {formErrors.objective && (
                  <p className="text-xs text-rose-400">{formErrors.objective}</p>
                )}
              </div>
            </div>

            {/* Custom sector input — only shown when 'Others' is selected */}
            {formData.business_category === CUSTOM_SECTOR_SENTINEL && (
              <div className="space-y-1.5 text-left">
                <label
                  htmlFor="custom_sector"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
                >
                  Specify Your Business Sector *
                </label>
                <input
                  id="custom_sector"
                  name="custom_sector"
                  type="text"
                  placeholder="e.g. Pet Grooming, EV Charging Station, Wedding Photography"
                  value={customSector}
                  onChange={(e) => {
                    setCustomSector(e.target.value)
                    if (e.target.value.trim()) setCustomSectorError(null)
                  }}
                  className="w-full rounded-lg bg-slate-900/80 border border-slate-800 px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                {customSectorError && (
                  <p className="text-xs text-rose-400">{customSectorError}</p>
                )}
                <p className="text-xs text-slate-500">
                  This exact value is saved as your business sector and used for location intelligence and competitor discovery.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Allocated Budget ($ USD)"
                id="budget"
                name="budget"
                type="number"
                min="0"
                step="500"
                placeholder="50000"
                value={formData.budget === null || formData.budget === undefined ? '' : formData.budget}
                onChange={handleChange}
                error={formErrors.budget}
                helperText="Estimated starting capital or investment threshold"
              />

              <Input
                label="Target Location / Market"
                id="target_location"
                name="target_location"
                placeholder="Austin, TX - Downtown Arts District"
                value={formData.target_location || ''}
                onChange={handleChange}
                error={formErrors.target_location}
                helperText="Geographic territory for location intelligence analysis"
              />
            </div>

            <Textarea
              label="Business Concept & Description"
              id="description"
              name="description"
              rows={4}
              placeholder="Provide context on your value proposition, target customer demographics, and operational model..."
              value={formData.description || ''}
              onChange={handleChange}
              error={formErrors.description}
            />

            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-end gap-3">
              <Link to="/dashboard">
                <Button variant="outline" size="md">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSubmitting}
                icon={<PlusCircle className="w-4 h-4" />}
              >
                Create Business Request
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
