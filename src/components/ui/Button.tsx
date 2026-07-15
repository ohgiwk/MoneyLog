import { type ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg' | 'fab'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-primary-500 text-white font-semibold active:bg-primary-600 disabled:opacity-50',
  secondary: 'border border-line text-ink-muted font-medium active:bg-surface-subtle',
  danger: 'bg-danger-500 text-white font-semibold active:bg-danger-600 disabled:opacity-50',
  ghost: 'text-ink-muted active:bg-surface-subtle',
}

const sizeClasses: Record<Size, string> = {
  sm: 'py-2.5 px-4 text-sm rounded-xl',
  md: 'py-3 text-sm rounded-xl',
  lg: 'py-3.5 text-base rounded-xl',
  fab: 'py-3.5 text-sm rounded-[2rem] shadow-lg disabled:opacity-50',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  children,
  ...props
}: Props) {
  return (
    <button
      className={[
        'flex items-center justify-center',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth ? 'w-full' : 'flex-1',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </button>
  )
}
