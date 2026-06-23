import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-aqua/50 disabled:opacity-50 disabled:cursor-not-allowed',
          {
            'bg-aqua text-navy hover:bg-aqua/90 active:scale-[0.98]': variant === 'primary',
            'border border-white/20 text-white hover:bg-white/10': variant === 'secondary',
            'text-white/70 hover:text-white hover:bg-white/10': variant === 'ghost',
            'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30': variant === 'danger',
          },
          {
            'px-4 py-2 text-sm': size === 'sm',
            'px-6 py-3 text-base': size === 'md',
            'px-8 py-4 text-lg': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
export default Button
