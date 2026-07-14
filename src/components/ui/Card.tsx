import { type HTMLAttributes } from 'react'

export default function Card({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`bg-surface rounded-2xl shadow-sm overflow-hidden ${className}`} {...props}>
      {children}
    </div>
  )
}
