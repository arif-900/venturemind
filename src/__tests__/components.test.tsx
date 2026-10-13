import { describe, it, expect } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Card, CardTitle } from '@/components/ui/Card'

describe('Reusable UI Components (SSR / String Render)', () => {
  it('renders Button with variants and loading state', () => {
    const htmlPrimary = renderToString(<Button variant="primary">Submit Request</Button>)
    expect(htmlPrimary).toContain('Submit Request')
    expect(htmlPrimary).toContain('bg-indigo-600')

    const htmlLoading = renderToString(<Button isLoading>Submit Request</Button>)
    expect(htmlLoading).toContain('disabled')
    expect(htmlLoading).toContain('animate-spin')
  })

  it('renders Input with accessible label and error text', () => {
    const html = renderToString(
      <Input
        label="Project Title"
        id="project-title"
        error="Title must be at least 3 characters"
      />
    )
    expect(html).toContain('Project Title')
    expect(html).toContain('for="project-title"')
    expect(html).toContain('Title must be at least 3 characters')
    expect(html).toContain('border-rose-500')
  })

  it('renders Alert component with accessibility role and variant styles', () => {
    const html = renderToString(
      <Alert variant="error" title="Auth Failure">
        Invalid login credentials
      </Alert>
    )
    expect(html).toContain('role="alert"')
    expect(html).toContain('Auth Failure')
    expect(html).toContain('Invalid login credentials')
    expect(html).toContain('border-rose-800/60')
  })

  it('renders Badge with correct status label and styles', () => {
    const html = renderToString(<Badge variant="analyzed">Analyzed</Badge>)
    expect(html).toContain('Analyzed')
    expect(html).toContain('bg-emerald-950/60')
  })

  it('renders Card with header and glassmorphism styling', () => {
    const html = renderToString(
      <Card glass>
        <CardTitle>Decision Matrix</CardTitle>
      </Card>
    )
    expect(html).toContain('Decision Matrix')
    expect(html).toContain('glass-card')
  })

  it('renders InteractiveAreaMap with style controls and epicenter zone', async () => {
    const { InteractiveAreaMap } = await import('@/components/map/InteractiveAreaMap')
    const html = renderToString(
      <InteractiveAreaMap
        center={[78.4793, 15.4844]}
        radiusMeters={1500}
        locationName="Srinivasa Nagar, Nandyal"
        competitors={[]}
      />
    )
    expect(html).toContain('Srinivasa Nagar, Nandyal')
    expect(html).toContain('km zone')
    expect(html).toContain('Streets')
    expect(html).toContain('Dark')
    expect(html).toContain('Satellite')
    expect(html).toContain('OSM')
    expect(html).toContain('Recenter')
  })
})


