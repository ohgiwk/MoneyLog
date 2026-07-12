import { useMemo } from 'react'
import { calcBudgetProgress, formatYen, mondayFirstDow } from '../utils'

export type PeriodMode = 'week' | 'month'

export default function BudgetProgressPanel({
  periodMode,
  setPeriodMode,
  weekRange,
  daysInMonth,
  month,
  oneTimeCategoryRows,
  onManageBudget,
}: {
  periodMode: PeriodMode
  setPeriodMode: (m: PeriodMode) => void
  weekRange: { start: string; end: string }
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
  // 期間ラベルと進捗率
  const { rangeLabel, filledDots, totalDots, periodLabel } = useMemo(() => {
    const today = new Date()
    if (periodMode === 'week') {
      const label = `${weekRange.start.slice(5).replace('-', '/')} 〜 ${weekRange.end.slice(5).replace('-', '/')}`
      const dow = mondayFirstDow(today)
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
  }, [periodMode, weekRange, month, daysInMonth])

  const rows = oneTimeCategoryRows.map((r) => {
    if (periodMode === 'week') return { ...r, spent: r.spent, budget: r.weekBudget }
    return { ...r, spent: r.monthSpent, budget: r.monthBudget }
  })

  const weekTotalBudget = oneTimeCategoryRows.reduce((sum, r) => sum + r.weekBudget, 0)
  const weekTotalSpent = oneTimeCategoryRows.reduce((sum, r) => sum + r.spent, 0)
  const monthTotalBudget = oneTimeCategoryRows.reduce((sum, r) => sum + r.monthBudget, 0)
  const monthTotalSpent = oneTimeCategoryRows.reduce((sum, r) => sum + r.monthSpent, 0)

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
      {/* ヘッダー行 */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-700">予算進捗</div>
        <div className="flex rounded-lg overflow-hidden border border-slate-200 text-xs">
          {(['week', 'month'] as PeriodMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setPeriodMode(m)}
              className={`px-2 py-1 ${periodMode === m ? 'bg-slate-700 text-white' : 'bg-white text-slate-500'}`}
            >
              {m === 'week' ? '週' : '月'}
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
              className={`rounded-full flex-1 h-2 ${
                i === filledDots
                  ? 'bg-amber-400'
                  : i < filledDots
                    ? 'bg-emerald-500'
                    : 'bg-slate-100'
              }`}
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

      <div className="h-px bg-slate-100" />

      {/* 予算合計/出費合計 */}
      <div className="text-right">
        <div className="text-xs text-slate-400 mb-1">
          {periodMode === 'week' ? '週の予算合計' : '月の予算合計'}
        </div>
        <div className="text-base text-slate-600">
          <span
            className={
              (periodMode === 'week' ? weekTotalSpent : monthTotalSpent) >
              (periodMode === 'week' ? weekTotalBudget : monthTotalBudget)
                ? 'text-rose-500 font-semibold'
                : 'font-medium'
            }
          >
            {formatYen(periodMode === 'week' ? weekTotalSpent : monthTotalSpent)}
          </span>
            {' / '}
            <span className="text-slate-400">
              {formatYen(periodMode === 'week' ? weekTotalBudget : monthTotalBudget)}
            </span>
        </div>
      </div>

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
  const { pct, over } = calcBudgetProgress(spent, budget)
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
