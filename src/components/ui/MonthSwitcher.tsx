import { monthLabel, shiftMonth } from '../../utils'

interface Props {
  month: string
  setMonth: (m: string) => void
  compact?: boolean
}

export default function MonthSwitcher({ month, setMonth, compact = false }: Props) {
  return (
    <div
      className={`flex items-center justify-between px-4 bg-surface border-b border-line-subtle ${compact ? 'py-2' : 'py-4'}`}
    >
      <button
        onClick={() => setMonth(shiftMonth(month, -1))}
        className={`flex items-center justify-center rounded-full bg-surface-hover text-ink-muted active:bg-surface-muted ${compact ? 'w-8 h-8 text-xl' : 'w-10 h-10 text-2xl'}`}
      >
        ‹
      </button>
      <span className={`font-semibold text-ink-strong ${compact ? 'text-sm' : 'text-lg'}`}>
        {monthLabel(month)}
      </span>
      <button
        onClick={() => setMonth(shiftMonth(month, 1))}
        className={`flex items-center justify-center rounded-full bg-surface-hover text-ink-muted active:bg-surface-muted ${compact ? 'w-8 h-8 text-xl' : 'w-10 h-10 text-2xl'}`}
      >
        ›
      </button>
    </div>
  )
}
