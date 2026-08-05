import { useMemo } from 'react'
import Button from './ui/Button'
import { calcBudgetProgress, formatYen, mondayFirstDow } from '../utils'

export type PeriodMode = 'week' | 'month'

const DUMMY_ROWS = [
  { cat: '食費', icon: '🍽️', spent: 18000, budget: 30000, weekBudget: 7000, daySpent: 0, dayBudget: 0, monthSpent: 18000, monthBudget: 30000 },
  { cat: '日用品', icon: '🧴', spent: 4500, budget: 10000, weekBudget: 2500, daySpent: 0, dayBudget: 0, monthSpent: 4500, monthBudget: 10000 },
  { cat: '娯楽', icon: '🎮', spent: 6000, budget: 8000, weekBudget: 2000, daySpent: 0, dayBudget: 0, monthSpent: 6000, monthBudget: 8000 },
]

export default function BudgetProgressPanel({
  periodMode,
  setPeriodMode,
  weekRange,
  daysInMonth,
  month,
  oneTimeCategoryRows,
  hasBudget = true,
  onManageBudget,
  naked = false,
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
  hasBudget?: boolean
  onManageBudget?: () => void
  naked?: boolean
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

  const displayRows = hasBudget ? oneTimeCategoryRows : DUMMY_ROWS
  const rows = displayRows.map((r) => {
    if (periodMode === 'week') return { ...r, spent: r.spent, budget: r.weekBudget }
    return { ...r, spent: r.monthSpent, budget: r.monthBudget }
  })

  const weekTotalBudget = displayRows.reduce((sum, r) => sum + r.weekBudget, 0)
  const weekTotalSpent = displayRows.reduce((sum, r) => sum + r.spent, 0)
  const monthTotalBudget = displayRows.reduce((sum, r) => sum + r.monthBudget, 0)
  const monthTotalSpent = displayRows.reduce((sum, r) => sum + r.monthSpent, 0)

  const inner = (
    <div className={`relative space-y-3 ${naked ? 'p-4' : 'bg-surface rounded-2xl p-4 shadow-sm'}`}>
      {/* ヘッダー行 */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-ink">予算進捗</div>
        <div className="flex rounded-lg overflow-hidden border border-line text-xs">
          {(['week', 'month'] as PeriodMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setPeriodMode(m)}
              className={`px-2 py-1 ${periodMode === m ? 'bg-primary-500 text-white' : 'bg-surface text-ink-muted'}`}
            >
              {m === 'week' ? '週' : '月'}
            </button>
          ))}
        </div>
      </div>

      {/* 期間進捗バー */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-ink-muted">{rangeLabel}</span>
          <span className="text-xs text-ink-muted">{periodLabel}</span>
        </div>
        <div className="flex gap-[3px] items-center">
          {Array.from({ length: totalDots }).map((_, i) => (
            <div
              key={i}
              className={`rounded-full flex-1 h-2 ${
                i === filledDots
                  ? 'bg-warning-400'
                  : i < filledDots
                    ? 'bg-income-500'
                    : 'bg-surface-hover'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="h-px bg-surface-hover" />

      {/* カテゴリ別予算進捗 */}
      {rows.length > 0 && rows.map(({ cat, icon, spent, budget }) => (
        <BudgetProgress
          key={cat}
          label={cat}
          icon={icon}
          spent={spent}
          budget={budget}
          color="bg-warning-400"
        />
      ))}

      <div className="h-px bg-surface-hover" />

      {/* 予算合計/出費合計 */}
      <div className="text-right">
        <div className="text-xs text-ink-muted mb-1">
          {periodMode === 'week' ? '週の予算合計' : '月の予算合計'}
        </div>
        <div className="text-base text-ink">
          <span
            className={
              (periodMode === 'week' ? weekTotalSpent : monthTotalSpent) >
              (periodMode === 'week' ? weekTotalBudget : monthTotalBudget)
                ? 'text-danger-500 font-semibold'
                : 'font-medium'
            }
          >
            {formatYen(periodMode === 'week' ? weekTotalSpent : monthTotalSpent)}
          </span>
            {' / '}
            <span className="text-ink-muted">
              {formatYen(periodMode === 'week' ? weekTotalBudget : monthTotalBudget)}
            </span>
        </div>
      </div>

      {hasBudget && onManageBudget && (
        <div className="pt-2">
          <Button variant="secondary" fullWidth size="sm" onClick={onManageBudget}>
            予算を管理
          </Button>
        </div>
      )}

      {!hasBudget && (
        <div className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center gap-3" style={{ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', background: 'rgb(var(--color-surface) / 0.55)' }}>
          <p className="text-sm font-semibold text-ink">予算がまだ設定されていません</p>
          {onManageBudget && (
            <div>
              <Button variant="primary" size="sm" onClick={onManageBudget}>
                予算を設定する
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )

  return inner
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
        <span className="text-xs text-ink flex items-center gap-1">
          <span>{icon}</span>
          {label}
        </span>
        <span className="text-xs text-ink-muted">
          <span className={over ? 'text-danger-500 font-semibold' : 'font-medium'}>
            {formatYen(spent)}
          </span>
          {' / '}
          <span className="text-ink-muted">{formatYen(budget)}</span>
        </span>
      </div>
      <div className="h-2.5 bg-surface-hover rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${over ? 'bg-danger-400' : color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {over && (
        <div className="text-xs text-danger-500 mt-0.5 text-right">
          {formatYen(spent - budget)} オーバー
        </div>
      )}
    </div>
  )
}
