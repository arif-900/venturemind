import React from 'react'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'draft' | 'submitted' | 'in_review' | 'analyzed' | 'archived' | 'neutral' | 'success' | 'warning' | 'danger'
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', className = '', ...props }) => {
  const variantStyles = {
    draft: 'bg-slate-800 text-slate-300 border-slate-700',
    submitted: 'bg-blue-950/60 text-blue-400 border-blue-800/60',
    in_review: 'bg-amber-950/60 text-amber-400 border-amber-800/60',
    analyzed: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60',
    archived: 'bg-slate-900 text-slate-500 border-slate-800',
    neutral: 'bg-slate-800 text-slate-300 border-slate-700',
    success: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60',
    warning: 'bg-amber-950/60 text-amber-400 border-amber-800/60',
    danger: 'bg-rose-950/60 text-rose-400 border-rose-800/60',
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  )
}
