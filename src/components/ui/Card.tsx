import React from 'react'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean
}

export const Card: React.FC<CardProps> = ({ children, className = '', glass = false, ...props }) => {
  return (
    <div
      className={`rounded-xl border ${
        glass
          ? 'glass-card border-slate-800/80 shadow-lg'
          : 'bg-slate-900/90 border-slate-800 shadow-md'
      } text-slate-100 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`p-6 pb-4 border-b border-slate-800/60 ${className}`} {...props}>
      {children}
    </div>
  )
}

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <h3 className={`text-lg font-semibold text-white tracking-tight ${className}`} {...props}>
      {children}
    </h3>
  )
}

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <p className={`text-sm text-slate-400 mt-1 ${className}`} {...props}>
      {children}
    </p>
  )
}

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`p-6 ${className}`} {...props}>
      {children}
    </div>
  )
}

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`p-6 pt-0 border-t border-slate-800/60 flex items-center justify-between ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
