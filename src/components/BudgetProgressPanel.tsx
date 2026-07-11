import { useMemo } from 'react'
import { formatYen } from '../utils'

export type PeriodMode = 'day' | 'week' | 'month'

export default function BudgetProgressPanel({
  periodMode,
  setPeriodMode,
  weekRange,
  dayRange,
  daysInMonth,
  month,
  oneTimeCategoryRows,
  onManageBudget,
}: {
  periodMode: PeriodMode
  setPeriodMode: (m: PeriodMode) => void
  weekRange: { start: string; end: string }
  dayRange: { start: string; end: string }
  daysInMonth: number
  month: string
  oneTimeCategoryRows: {
    cat: string
    icon: string
    spent: number
    weekBudget: number
    daySpent: number
    dayBudget: number
    monthSpent: number
    monthBudget: number
  }[]
  onManageBudget?: () => void
}) {
  const today = new Date()

  // 期間ラベルと進捗率
  const { rangeLabel, filledDots, totalDots, periodLabel } = useMemo(() => {
    if (periodMode === 'day') {
      const d = dayRange.start
      const label = d.slice(5).replace('-', '/')
      const hours = today.getHours()
      return {
        rangeLabel: label,
        filledDots: hours,
        totalDots: 24,
        periodLabel: `${today.getHours()}:${String(today.getMinutes()).padStart(2, '0')} / 24:00`,
      }
    }
    if (periodMode === 'week') {
      const label = `${weekRange.start.slice(5).replace('-', '/')} 〜 ${weekRange.end.slice(5).replace('-', '/')}`
      const dow = (today.getDay() + 6) % 7 // 0=Mon
      return {
        rangeLabel: label,
        filledDots: dow,
        totalDots: 7,
        periodLabel: `${dow + 1}日目 / 7日`,
      }
    }
    // month
    const [y, m] = month.split('-').map(Number)
    const label = `${y}/${String(m).padStart(2, '0')}`
    const dayOfMonth = today.getDate()
    return {
      rangeLabel: label,
      filledDots: dayOfMonth - 1,
      totalDots: daysInMonth,
      periodLabel: `${dayOfMonth}日 / ${daysInMonth}日`,
    }
  }, [periodMode, dayRange, weekRange, month, daysInMonth, today])

  const rows = oneTimeCategoryRows.map((r) => {
    if (periodMode === 'day') return { ...r, spent: r.daySpent, budget: r.dayBudget }
    if (periodMode === 'week') return { ...r, spent: r.spent, budget: r.weekBudget }
    return { ...r, spent: r.monthSpent, budget: r.monthBudget }
  })

  const modeLabel = periodMode === 'day' ? '日割り' : periodMode === 'week' ? '週割り' : '月'

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
      {/* ヘッダー行 */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-700">{modeLabel}予算進捗</div>
        <div className="flex rounded-lg overflow-hidden border border-slate-200 text-xs">
          {(['day', 'week', 'month'] as PeriodMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setPeriodMode(m)}
              className={`px-2 py-1 ${periodMode === m ? 'bg-slate-700 text-white' : 'bg-white text-slate-500'}`}
            >
              {m === 'day' ? '日' : m === 'week' ? '週' : '月'}
            </button>
          ))}
        </div>
      </div>

      {/* 期間進捗バー */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-slate-400">{rangeLabel}</span>
          <span className="text-xs text-slate-400">{periodLabel}</span>
        </div>
        <div className="flex gap-[3px] items-center">
          {Array.from({ length: totalDots }).map((_, i) => (
            <div
              key={i}
              className={`rounded-full flex-1 h-2 ${i < filledDots ? 'bg-slate-400' : 'bg-slate-100'}`}
            />
          ))}
        </div>
      </div>

      <div className="h-px bg-slate-100" />

      {/* カテゴリ別予算進捗 */}
      {rows.length > 0 && rows.map(({ cat, icon, spent, budget }) => (
        <BudgetProgress
          key={cat}
          label={cat}
          icon={icon}
          spent={spent}
          budget={budget}
          color="bg-amber-400"
        />
      ))}

      {onManageBudget && (
        <div className="pt-2">
          <button
            onClick={onManageBudget}
            className="w-full text-center py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 active:bg-slate-50"
          >
            予算を管理
          </button>
        </div>
      )}
    </div>
  )
}

function BudgetProgress({
  label,
  icon,
  spent,
  budget,
  color,
}: {
  label: string
  icon: string
  spent: number
  budget: number
  color: string
}) {
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0
  const over = spent > budget && budget > 0
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-slate-600 flex items-center gap-1">
          <span>{icon}</span>
          {label}
        </span>
        <span className="text-xs text-slate-500">
          <span className={over ? 'text-rose-500 font-semibold' : 'font-medium'}>
            {formatYen(spent)}
          </span>
          {' / '}
          <span className="text-slate-400">{formatYen(budget)}</span>
        </span>
      </div>
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${over ? 'bg-rose-400' : color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {over && (
        <div className="text-xs text-rose-500 mt-0.5 text-right">
          {formatYen(spent - budget)} オーバー
        </div>
      )}
    </div>
  )
}
