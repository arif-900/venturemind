import React from 'react'
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react'

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error'
  title?: string
}

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  children,
  className = '',
  ...props
}) => {
  const icons = {
    info: <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />,
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />,
    error: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />,
  }

  const styles = {
    info: 'bg-blue-950/40 border-blue-800/60 text-blue-200',
    success: 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200',
    warning: 'bg-amber-950/40 border-amber-800/60 text-amber-200',
    error: 'bg-rose-950/40 border-rose-800/60 text-rose-200',
  }

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-4 rounded-xl border text-sm leading-relaxed ${styles[variant]} ${className}`}
      {...props}
    >
      {icons[variant]}
      <div className="flex-1">
        {title && <h5 className="font-semibold text-white mb-1">{title}</h5>}
        <div>{children}</div>
      </div>
    </div>
  )
}

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', ...props }) => {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-800/80 ${className}`}
      {...props}
    />
  )
}
