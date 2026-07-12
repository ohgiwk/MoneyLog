import { monthLabel, shiftMonth } from '../../utils'

interface Props {
  month: string
  setMonth: (m: string) => void
}

export default function MonthSwitcher({ month, setMonth }: Props) {
  return (
    <div className="flex items-center justify-between px-4 py-4 bg-surface border-b border-line-subtle">
      <button
        onClick={() => setMonth(shiftMonth(month, -1))}
        className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-hover text-ink-muted active:bg-surface-muted text-2xl"
      >
        ‹
      </button>
      <span className="text-lg font-bold text-ink-strong">{monthLabel(month)}</span>
      <button
        onClick={() => setMonth(shiftMonth(month, 1))}
        className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-hover text-ink-muted active:bg-surface-muted text-2xl"
      >
        ›
      </button>
    </div>
  )
}
