import React from 'react'
import { Loader2 } from 'lucide-react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  icon?: React.ReactNode
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = '',
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      icon,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-indigo-500 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none'

    const variantStyles = {
      primary:
        'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm hover:shadow active:bg-indigo-700',
      secondary:
        'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 active:bg-slate-900',
      outline:
        'border border-slate-700 hover:border-slate-600 bg-transparent text-slate-300 hover:text-white hover:bg-slate-800/50',
      ghost:
        'bg-transparent hover:bg-slate-800/60 text-slate-300 hover:text-white',
      danger:
        'bg-rose-600 hover:bg-rose-500 text-white shadow-sm active:bg-rose-700',
    }

    const sizeStyles = {
      sm: 'text-xs px-2.5 py-1.5 gap-1.5',
      md: 'text-sm px-4 py-2 gap-2',
      lg: 'text-base px-5 py-2.5 gap-2.5',
    }

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : icon ? (
          <span className="shrink-0">{icon}</span>
        ) : null}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
