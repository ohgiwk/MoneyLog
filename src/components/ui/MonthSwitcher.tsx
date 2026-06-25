import { monthLabel, shiftMonth } from '../../utils'

interface Props {
  month: string
  setMonth: (m: string) => void
}

export default function MonthSwitcher({ month, setMonth }: Props) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100">
      <button
        onClick={() => setMonth(shiftMonth(month, -1))}
        className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 active:bg-slate-100"
      >
        ‹
      </button>
      <span className="text-sm font-semibold text-slate-700">{monthLabel(month)}</span>
      <button
        onClick={() => setMonth(shiftMonth(month, 1))}
        className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 active:bg-slate-100"
      >
        ›
      </button>
    </div>
  )
}
