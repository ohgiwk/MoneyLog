import { type HTMLAttributes } from 'react'

export default function ErrorText({
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  if (!children) return null
  return (
    <p className={`text-xs text-danger-500 mt-1 ${className}`} {...props}>
      {children}
    </p>
  )
}
