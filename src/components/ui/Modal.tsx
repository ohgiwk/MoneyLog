import { createPortal } from 'react-dom'
import { type ReactNode } from 'react'

interface Props {
  isOpen: boolean
  onClose?: () => void
  children: ReactNode
  position?: 'center' | 'bottom'
  className?: string
}

export default function Modal({ isOpen, onClose, children, position = 'center', className = '' }: Props) {
  if (!isOpen) return null

  const alignClass = position === 'bottom'
    ? 'items-end sm:items-center'
    : 'items-center'

  const containerClass = position === 'bottom'
    ? 'w-full max-w-md rounded-t-2xl sm:rounded-2xl'
    : 'w-72 mx-4 rounded-2xl'

  return createPortal(
    <div className={`fixed inset-0 z-50 flex justify-center ${alignClass}`}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative bg-surface shadow-xl ${containerClass} ${className}`}>
        {children}
      </div>
    </div>,
    document.body
  )
}
