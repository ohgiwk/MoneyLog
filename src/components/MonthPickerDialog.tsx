import { useState } from 'react'
import Modal from './ui/Modal'
import YearSwitcher from './ui/YearSwitcher'
import { todayStr } from '../utils'

interface Props {
  month: string // YYYY-MM
  onSelect: (month: string) => void
  onClose: () => void
}

export default function MonthPickerDialog({ month, onSelect, onClose }: Props) {
  const [year, setYear] = useState(() => Number(month.slice(0, 4)))
  const thisMonth = todayStr().slice(0, 7)

  return (
    <Modal isOpen onClose={onClose} className="overflow-hidden">
      <YearSwitcher
        year={String(year)}
        onPrev={() => setYear((y) => y - 1)}
        onNext={() => setYear((y) => y + 1)}
      />
      <div className="grid grid-cols-4 gap-2 p-4">
        {Array.from({ length: 12 }, (_, i) => {
          const m = `${year}-${String(i + 1).padStart(2, '0')}`
          return (
            <button
              key={m}
              type="button"
              onClick={() => onSelect(m)}
              aria-pressed={m === month}
              className={
                'py-2.5 rounded-xl text-sm font-semibold border ' +
                (m === month
                  ? 'bg-primary-500 border-primary-500 text-white'
                  : m === thisMonth
                    ? 'border-primary-400 text-primary-600 dark:text-primary-400 active:bg-surface-hover'
                    : 'border-transparent text-ink active:bg-surface-hover')
              }
            >
              {i + 1}月
            </button>
          )
        })}
      </div>
    </Modal>
  )
}
