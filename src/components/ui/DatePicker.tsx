import { useState, useMemo } from 'react'

interface Props {
  value: string // YYYY-MM-DD
  onChange: (value: string) => void
  label?: string
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

function parseDate(value: string): { year: number; month: number; day: number } | null {
  if (!value) return null
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return null
  return { year: y, month: m, day: d }
}

function formatDisplay(value: string): string {
  const parsed = parseDate(value)
  if (!parsed) return '日付を選択'
  const { year, month, day } = parsed
  const date = new Date(year, month - 1, day)
  const weekday = WEEKDAYS[date.getDay()]
  return `${year}年${month}月${day}日（${weekday}）`
}

export default function DatePicker({ value, onChange, label }: Props) {
  const [open, setOpen] = useState(false)

  const today = new Date()
  const parsed = parseDate(value)

  const [viewYear, setViewYear] = useState(parsed?.year ?? today.getFullYear())
  const [viewMonth, setViewMonth] = useState(parsed?.month ?? today.getMonth() + 1)

  const days = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth - 1, 1).getDay()
    const lastDate = new Date(viewYear, viewMonth, 0).getDate()
    const cells: (number | null)[] = Array(firstDay).fill(null)
    for (let d = 1; d <= lastDate; d++) cells.push(d)
    // 6行になるよう末尾を埋める
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [viewYear, viewMonth])

  function prevMonth() {
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12) }
    else setViewMonth(m => m - 1)
  }

  function nextMonth() {
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1) }
    else setViewMonth(m => m + 1)
  }

  function selectDay(day: number) {
    const mm = String(viewMonth).padStart(2, '0')
    const dd = String(day).padStart(2, '0')
    onChange(`${viewYear}-${mm}-${dd}`)
    setOpen(false)
  }

  function openPicker() {
    const p = parseDate(value)
    setViewYear(p?.year ?? today.getFullYear())
    setViewMonth(p?.month ?? today.getMonth() + 1)
    setOpen(true)
  }

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  return (
    <>
      {label && <label className="text-xs text-slate-400">{label}</label>}
      <button
        type="button"
        onClick={openPicker}
        className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm text-left bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300 flex items-center justify-between"
      >
        <span className={value ? 'text-slate-700' : 'text-slate-400'}>
          {formatDisplay(value)}
        </span>
        <span className="text-slate-400 text-base">📅</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-sm px-4 pt-5 pb-6">

            {/* 月ナビゲーション */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={prevMonth}
                className="w-9 h-9 flex items-center justify-center rounded-full active:bg-slate-100 text-slate-500"
              >
                ‹
              </button>
              <span className="font-bold text-slate-800">
                {viewYear}年{viewMonth}月
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="w-9 h-9 flex items-center justify-center rounded-full active:bg-slate-100 text-slate-500"
              >
                ›
              </button>
            </div>

            {/* 曜日ヘッダー */}
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map((w, i) => (
                <div
                  key={w}
                  className={`text-center text-xs font-medium py-1 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-slate-400'}`}
                >
                  {w}
                </div>
              ))}
            </div>

            {/* カレンダーグリッド */}
            <div className="grid grid-cols-7">
              {days.map((day, i) => {
                if (day === null) return <div key={i} />
                const mm = String(viewMonth).padStart(2, '0')
                const dd = String(day).padStart(2, '0')
                const dateStr = `${viewYear}-${mm}-${dd}`
                const isSelected = dateStr === value
                const isToday = dateStr === todayStr
                const col = i % 7
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectDay(day)}
                    className={
                      'flex items-center justify-center h-10 text-sm rounded-full mx-0.5 my-0.5 transition-colors ' +
                      (isSelected
                        ? 'bg-emerald-500 text-white font-bold'
                        : isToday
                        ? 'border border-emerald-400 text-emerald-600 font-semibold'
                        : col === 0
                        ? 'text-red-400 active:bg-red-50'
                        : col === 6
                        ? 'text-blue-400 active:bg-blue-50'
                        : 'text-slate-700 active:bg-slate-100')
                    }
                  >
                    {day}
                  </button>
                )
              })}
            </div>

            {/* 今日ボタン */}
            <div className="mt-3 flex justify-center">
              <button
                type="button"
                onClick={() => { onChange(todayStr); setOpen(false) }}
                className="px-5 py-2 text-sm text-emerald-600 font-medium active:bg-emerald-50 rounded-xl"
              >
                今日
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
