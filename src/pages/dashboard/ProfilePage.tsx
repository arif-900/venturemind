import React, { useState } from 'react'
import { Shield } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'

export const ProfilePage: React.FC = () => {
  const { user, profile, refreshProfile, isConfigured } = useAuth()

  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsSaving(true)
    setSaveSuccess(false)
    setSaveError(null)

    if (!isConfigured) {
      setSaveError('Configuration error: Database connection is not available.')
      setIsSaving(false)
      return
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone || null,
        })
        .eq('auth_user_id', user.id)

      if (error) {
        setSaveError('Unable to update profile. Please try again.')
      } else {
        setSaveSuccess(true)
        await refreshProfile()
      }
    } catch {
      setSaveError('An unexpected error occurred while saving changes.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800/80">
        <h1 className="text-xl font-bold text-white tracking-tight">Account & Profile</h1>
        <p className="text-xs text-slate-400">
          Manage your personal information and contact preferences
        </p>
      </div>

      {saveSuccess && (
        <Alert variant="success" title="Changes Saved">
          Your changes have been saved successfully.
        </Alert>
      )}

      {saveError && (
        <Alert variant="error" title="Notice">
          {saveError}
        </Alert>
      )}

      <Card glass className="border-slate-800">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400 text-lg font-bold">
              {fullName ? fullName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
            </div>
            <div>
              <CardTitle>{fullName || 'Founder Profile'}</CardTitle>
              <CardDescription>{user?.email}</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <Input
              label="Full Name"
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
            />

            <Input
              label="Email Address"
              id="email"
              value={user?.email || ''}
              disabled
              helperText="Primary email associated with your account"
            />

            <Input
              label="Phone Number"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
            />

            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Membership Status
              </label>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
                <span className="capitalize font-medium text-white">{profile?.role || 'Entrepreneur'}</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded">
                  Verified Active
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <Button type="submit" variant="primary" size="md" isLoading={isSaving}>
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="p-5 border-slate-800 bg-slate-900/40 text-xs">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-semibold text-white">Privacy & Account Security</h4>
            <p className="text-slate-400 leading-relaxed">
              Your business workspaces, financial figures, and strategic initiatives are private and protected with enterprise data isolation. Only authenticated sessions on your account can access your data.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
