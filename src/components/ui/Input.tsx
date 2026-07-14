import { type InputHTMLAttributes, forwardRef } from 'react'

type Variant = 'default' | 'dialog'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  variant?: Variant
  error?: boolean
}

const variantClasses: Record<Variant, string> = {
  default: 'focus:ring-2 focus:ring-primary-300 py-2',
  dialog: 'focus:border-primary-400 py-2.5 text-ink-strong',
}

const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { variant = 'default', error, className = '', ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={[
        'w-full border rounded-xl px-3 text-sm focus:outline-none',
        error ? 'border-danger-400' : 'border-line',
        variantClasses[variant],
        className,
      ].join(' ')}
      {...props}
    />
  )
})

export default Input
