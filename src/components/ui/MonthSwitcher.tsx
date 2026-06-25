import { monthLabel, shiftMonth } from '../../utils'

interface Props {
  month: string
  setMonth: (m: string) => void
}

export default function MonthSwitcher({ month, setMonth }: Props) {
  return (
    <div className="flex items-center justify-between px-4 py-4 bg-white border-b border-slate-100">
      <button
        onClick={() => setMonth(shiftMonth(month, -1))}
        className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 active:bg-slate-200 text-2xl"
      >
        ‹
      </button>
      <span className="text-lg font-bold text-slate-800">{monthLabel(month)}</span>
      <button
        onClick={() => setMonth(shiftMonth(month, 1))}
        className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 active:bg-slate-200 text-2xl"
      >
        ›
      </button>
    </div>
  )
}
