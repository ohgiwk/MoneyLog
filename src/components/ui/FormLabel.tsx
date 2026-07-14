import { type LabelHTMLAttributes } from 'react'

interface Props extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean
}

export default function FormLabel({ required, children, className = '', ...props }: Props) {
  return (
    <label className={`block text-xs text-ink-muted mb-1 ${className}`} {...props}>
      {children}
      {required && <span className="text-danger-500 ml-0.5">*</span>}
    </label>
  )
}
