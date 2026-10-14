import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFixedExpenseHistoryQuery } from '../hooks/queries/useFixedExpenseHistoryQuery'
import { summarizeHistory, type HistoryChange, type MonthSummary } from '../lib/fixedExpenseHistory'
import { currentMonthStr } from '../lib/loan'
import { formatYen, monthLabel, shiftMonth } from '../utils'
import { ExpenseBarChart } from './analytics/ExpenseBarChart'
import ScreenHeader from './ui/ScreenHeader'

interface Props {
  userId: string
}

const CHART_MONTHS = 12

const CHANGE_BADGE: Record<Exclude<HistoryChange, 'same'>, { label: string; className: string }> = {
  new: { label: '新規', className: 'bg-primary-50 text-primary-700' },
  up: { label: '増額', className: 'bg-danger-50 text-danger-600' },
  down: { label: '減額', className: 'bg-primary-50 text-primary-600' },
  ended: { label: '終了', className: 'bg-surface-muted text-ink-muted' },
}

// 増えたら赤、減ったら緑（固定費は少ないほど良い）
function DiffText({ diff, className = '' }: { diff: number; className?: string }) {
  if (diff === 0) return <span className={`text-ink-muted ${className}`}>±0円</span>
  return (
    <span
      className={`font-semibold ${diff > 0 ? 'text-danger-500' : 'text-primary-600'} ${className}`}
    >
      {diff > 0 ? '+' : '-'}
      {formatYen(Math.abs(diff))}
    </span>
  )
}

function MonthDetail({ summary }: { summary: MonthSummary }) {
  const { month, total, prevMonth, diff, items } = summary
  const comparedLabel =
    prevMonth == null
      ? null
      : prevMonth === shiftMonth(month, -1)
        ? '前月比'
        : `${monthLabel(prevMonth)}比`
  const activeCount = items.filter((it) => it.change !== 'ended').length

  return (
    <div className="bg-surface rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 flex items-end justify-between gap-3">
        <div className="text-xs text-ink-muted">
          {activeCount}件
          {comparedLabel && diff != null && (
            <>
              {' ・ '}
              {comparedLabel} <DiffText diff={diff} />
            </>
          )}
        </div>
        <div className="text-2xl font-bold text-ink">{formatYen(total)}</div>
      </div>

      <ul className="border-t border-line-subtle divide-y divide-line-subtle">
        {items.map((it) => {
          const badge = it.change === 'same' ? null : CHANGE_BADGE[it.change]
          const ended = it.change === 'ended'
          return (
            <li key={it.key} className="px-4 py-2.5 flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div
                  className={`text-sm truncate ${ended ? 'text-ink-muted line-through' : 'text-ink'}`}
                >
                  {it.name}
                </div>
                <div className="text-[11px] text-ink-muted">{it.category}</div>
              </div>
              {badge && (
                <span
                  className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded ${badge.className}`}
                >
                  {badge.label}
                </span>
              )}
              <div className="shrink-0 text-right">
                <div className={`text-sm font-semibold ${ended ? 'text-ink-muted' : 'text-ink'}`}>
                  {ended ? formatYen(it.prevAmount ?? 0) : formatYen(it.amount)}
                </div>
                {(it.change === 'up' || it.change === 'down') && it.prevAmount != null && (
                  <DiffText diff={it.amount - it.prevAmount} className="text-[11px]" />
                )}
              </div>
            </li>
          )
        })}
        {items.length === 0 && (
          <li className="px-4 py-3 text-sm text-ink-muted">固定費はありません</li>
        )}
      </ul>
    </div>
  )
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points={dir === 'left' ? '15 18 9 12 15 6' : '9 18 15 12 9 6'} />
    </svg>
  )
}

export default function FixedExpenseHistoryScreen({ userId }: Props) {
  const navigate = useNavigate()
  const { data: records = [], isLoading, isError } = useFixedExpenseHistoryQuery(userId)
  const summaries = useMemo(() => summarizeHistory(records), [records])
  // 未選択のときは最新の記録月を表示する
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const foundIndex = summaries.findIndex((s) => s.month === selectedMonth)
  const selectedIndex = foundIndex === -1 ? 0 : foundIndex
  const selected = summaries[selectedIndex]
  // summaries は新しい月から並んでいるので、前の月は index + 1、次の月は index - 1
  const olderMonth = summaries[selectedIndex + 1]?.month ?? null
  const newerMonth = summaries[selectedIndex - 1]?.month ?? null

  const chartEntries = useMemo(() => {
    const totals = new Map(summaries.map((s) => [s.month, s.total]))
    const latest = currentMonthStr()
    return Array.from({ length: CHART_MONTHS }, (_, i) => {
      const m = shiftMonth(latest, i - (CHART_MONTHS - 1))
      return { label: `${Number(m.slice(5))}月`, amount: totals.get(m) ?? 0 }
    })
  }, [summaries])

  return (
    <div className="max-w-md mx-auto h-[100dvh] bg-surface-subtle flex flex-col overflow-hidden">
      <ScreenHeader title="固定費履歴" onBack={() => navigate(-1)} />

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        {isError && (
          <div className="bg-danger-50 border border-danger-200 rounded-xl px-4 py-3 text-sm text-danger-600">
            データの読み込みに失敗しました
          </div>
        )}

        {isLoading ? (
          <div className="text-center text-ink-muted text-sm py-12">読み込み中...</div>
        ) : summaries.length === 0 ? (
          !isError && (
            <div className="text-center text-ink-muted text-sm py-12">
              まだ記録がありません。
              <br />
              固定費を登録すると、毎月の金額が記録されます。
            </div>
          )
        ) : (
          <>
            <div className="bg-surface rounded-2xl p-4 shadow-sm">
              <div className="text-sm font-semibold text-ink mb-3">
                固定費合計の推移（月額換算）
              </div>
              <ExpenseBarChart entries={chartEntries} barGap="gap-1" />
            </div>

            {summaries.length === 1 && (
              <div className="text-xs text-ink-muted px-1">
                固定費は毎月記録されます。来月から前月との変化を比べられます。
              </div>
            )}

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => olderMonth && setSelectedMonth(olderMonth)}
                disabled={!olderMonth}
                className="w-9 h-9 flex items-center justify-center rounded-full text-ink-muted active:bg-surface-hover disabled:opacity-30"
                aria-label="前の月"
              >
                <Chevron dir="left" />
              </button>
              <div className="min-w-[8.5rem] text-center">
                <span className="text-base font-bold text-ink-strong">
                  {monthLabel(selected.month)}
                </span>
                {selected.month === currentMonthStr() && (
                  <span className="ml-1.5 text-[10px] font-semibold text-primary-600">今月</span>
                )}
              </div>
              <button
                onClick={() => newerMonth && setSelectedMonth(newerMonth)}
                disabled={!newerMonth}
                className="w-9 h-9 flex items-center justify-center rounded-full text-ink-muted active:bg-surface-hover disabled:opacity-30"
                aria-label="次の月"
              >
                <Chevron dir="right" />
              </button>
            </div>

            <MonthDetail summary={selected} />
          </>
        )}
      </div>
    </div>
  )
}
