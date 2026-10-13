import React from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ id, label, error, helperText, className = '', ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={`w-full rounded-lg bg-slate-900/80 border ${
            error ? 'border-rose-500 focus:border-rose-500' : 'border-slate-800 focus:border-indigo-500'
          } px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-colors focus:outline-none focus:ring-1 ${
            error ? 'focus:ring-rose-500' : 'focus:ring-indigo-500'
          } disabled:bg-slate-950 disabled:opacity-50 ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}
        {helperText && !error && <p className="text-xs text-slate-400">{helperText}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ id, label, error, helperText, className = '', ...props }, ref) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label htmlFor={textareaId} className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          rows={props.rows || 4}
          className={`w-full rounded-lg bg-slate-900/80 border ${
            error ? 'border-rose-500 focus:border-rose-500' : 'border-slate-800 focus:border-indigo-500'
          } px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-colors focus:outline-none focus:ring-1 ${
            error ? 'focus:ring-rose-500' : 'focus:ring-indigo-500'
          } disabled:bg-slate-950 disabled:opacity-50 resize-y ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}
        {helperText && !error && <p className="text-xs text-slate-400">{helperText}</p>}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'
