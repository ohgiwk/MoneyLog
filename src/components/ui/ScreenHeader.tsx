import { type ReactNode } from 'react'

interface Props {
  title: string
  onBack: () => void
  rightAction?: ReactNode
}

export default function ScreenHeader({ title, onBack, rightAction }: Props) {
  return (
    <div className="px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] grid grid-cols-[2.5rem_1fr_2.5rem] items-center bg-surface-subtle border-b-2 border-primary-500">
      <button
        onClick={onBack}
        className="text-ink-muted active:text-ink justify-self-start p-1"
        aria-label="戻る"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <span className="font-semibold text-ink-strong text-center truncate">{title}</span>
      <span className="justify-self-end">{rightAction}</span>
    </div>
  )
}
