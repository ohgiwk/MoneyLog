import { type ButtonHTMLAttributes, type ReactNode } from 'react'

type Size = 'sm' | 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  label: string
  size?: Size
}

const sizeClasses: Record<Size, string> = {
  sm: 'w-8 h-8',
  md: 'w-9 h-9',
  lg: 'w-10 h-10',
}

export default function IconButton({ icon, label, size = 'md', className = '', ...props }: Props) {
  return (
    <button
      aria-label={label}
      className={[
        'flex items-center justify-center rounded-full text-ink-muted active:bg-surface-hover',
        sizeClasses[size],
        className,
      ].join(' ')}
      {...props}
    >
      {icon}
    </button>
  )
}
