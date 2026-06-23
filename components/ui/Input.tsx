import { cn } from '@/lib/utils'
import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  prefix?: string
  suffix?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, error, prefix, suffix, id, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-white/80">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {prefix && (
            <span className="absolute left-4 text-white/50 font-medium pointer-events-none">{prefix}</span>
          )}
          <input
            id={id}
            ref={ref}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
            className={cn(
              'w-full bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50',
              'focus:outline-none focus:border-aqua/60 focus:ring-1 focus:ring-aqua/40 transition-all',
              'py-3.5 text-base',
              prefix ? 'pl-8 pr-4' : 'px-4',
              suffix ? 'pr-12' : '',
              error && 'border-red-400/60 focus:border-red-400/60 focus:ring-red-400/40',
              className
            )}
            {...props}
          />
          {suffix && (
            <span className="absolute right-4 text-white/50 font-medium pointer-events-none">{suffix}</span>
          )}
        </div>
        {hint && !error && <p id={`${id}-hint`} className="text-sm text-white/60">{hint}</p>}
        {error && <p id={`${id}-error`} className="text-sm text-red-300">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
export default Input
