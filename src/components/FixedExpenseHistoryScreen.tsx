import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useFixedExpenseHistoryAdd,
  useFixedExpenseHistoryDelete,
  useFixedExpenseHistoryQuery,
} from '../hooks/queries/useFixedExpenseHistoryQuery'
import { useFixedExpensesQuery } from '../hooks/queries/useFixedExpensesQuery'
import {
  addableFixedExpenses,
  summarizeHistory,
  matchesStatusFilter,
  sortByCategoryOrder,
  toMonthlyRecord,
  type AddStatusFilter,
  type HistoryChange,
  type HistoryItem,
  type MonthSummary,
} from '../lib/fixedExpenseHistory'
import { STATUS_LABELS } from '../constants'
import { useAppContext } from '../contexts/AppContext'
import { currentMonthStr } from '../lib/loan'
import { formatYen, monthLabel, shiftMonth } from '../utils'
import { ExpenseBarChart } from './analytics/ExpenseBarChart'
import ScreenHeader from './ui/ScreenHeader'
import BottomSheet from './ui/BottomSheet'
import Button from './ui/Button'
import ConfirmDialog from './ui/ConfirmDialog'
import { TabGroup } from './ui/TabGroup'

interface Props {
  userId: string
}

const CHART_MONTHS = 12

const STATUS_FILTER_TABS: { key: AddStatusFilter; label: string }[] = [
  { key: 'all', label: 'すべて' },
  { key: 'active', label: STATUS_LABELS.active.label },
  { key: 'unsubscribed', label: STATUS_LABELS.unsubscribed.label },
  { key: 'cancelled', label: STATUS_LABELS.cancelled.label },
]

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

function MonthDetail({
  summary,
  categoryOrder,
  onDelete,
}: {
  summary: MonthSummary
  categoryOrder: string[]
  // 過去の月だけ渡す（当月は自動で同期されるため削除できない）
  onDelete?: (item: HistoryItem) => void
}) {
  const { month, total, prevMonth, diff, items } = summary
  const comparedLabel =
    prevMonth == null
      ? null
      : prevMonth === shiftMonth(month, -1)
        ? '前月比'
        : `${monthLabel(prevMonth)}比`
  const activeCount = items.filter((it) => it.change !== 'ended').length
  const sortedItems = useMemo(
    () => sortByCategoryOrder(items, categoryOrder),
    [items, categoryOrder]
  )

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
        {sortedItems.map((it) => {
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
              {onDelete &&
                (it.recordId ? (
                  <button
                    onClick={() => onDelete(it)}
                    className="shrink-0 -mr-2 p-2 text-ink-muted active:text-danger-500"
                    aria-label={`${it.name}を削除`}
                  >
                    <TrashIcon />
                  </button>
                ) : (
                  // 「終了」の行は記録がないので、削除ボタンの分だけ幅をそろえる
                  <span className="shrink-0 w-[34px] -mr-2" aria-hidden />
                ))}
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

function TrashIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
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
  const { data: fixedExpenses = [] } = useFixedExpensesQuery(userId)
  const addMutation = useFixedExpenseHistoryAdd(userId)
  const deleteMutation = useFixedExpenseHistoryDelete(userId)
  const summaries = useMemo(() => summarizeHistory(records), [records])
  const currentMonth = currentMonthStr()
  const { categories } = useAppContext()
  const categoryOrder = useMemo(
    () => categories.activeFixedCategories.map((c) => c.name),
    [categories.activeFixedCategories]
  )

  // 未選択のときは最新の記録月（記録がなければ今月）を表示する
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const month = selectedMonth ?? summaries[0]?.month ?? currentMonth
  const selected = summaries.find((s) => s.month === month) ?? null
  // 当月は固定費の設定から自動で同期されるので、手動の追加・削除は過去の月に限る
  const editable = month < currentMonth

  const [addOpen, setAddOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<AddStatusFilter>('all')
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<HistoryItem | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const addable = useMemo(
    () =>
      sortByCategoryOrder(
        addableFixedExpenses(
          fixedExpenses,
          records.filter((r) => r.month === month)
        ),
        categoryOrder
      ),
    [fixedExpenses, records, month, categoryOrder]
  )

  const chartEntries = useMemo(() => {
    const totals = new Map(summaries.map((s) => [s.month, s.total]))
    return Array.from({ length: CHART_MONTHS }, (_, i) => {
      const m = shiftMonth(currentMonth, i - (CHART_MONTHS - 1))
      return { label: `${Number(m.slice(5))}月`, amount: totals.get(m) ?? 0 }
    })
  }, [summaries, currentMonth])

  function changeMonth(m: string) {
    setSelectedMonth(m)
    setActionError(null)
  }

  function openAddSheet() {
    setCheckedIds(new Set())
    setStatusFilter('all')
    setAddOpen(true)
  }

  function toggleChecked(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const visibleAddable = addable.filter((f) => matchesStatusFilter(f, statusFilter))
  // 「すべて選択」は表示中の項目だけを対象にする（絞り込みを切り替えても選択は保つ）
  const allChecked = visibleAddable.length > 0 && visibleAddable.every((f) => checkedIds.has(f.id))
  const someChecked = visibleAddable.some((f) => checkedIds.has(f.id))

  function toggleAll() {
    setCheckedIds((prev) => {
      const next = new Set(prev)
      for (const f of visibleAddable) {
        if (allChecked) next.delete(f.id)
        else next.add(f.id)
      }
      return next
    })
  }

  async function handleAdd() {
    const rows = addable
      .filter((f) => checkedIds.has(f.id))
      .map((f) => toMonthlyRecord(userId, f, month))
    try {
      await addMutation.mutateAsync(rows)
      setActionError(null)
      setAddOpen(false)
    } catch {
      setActionError('固定費の追加に失敗しました')
      setAddOpen(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget?.recordId) return
    try {
      await deleteMutation.mutateAsync([deleteTarget.recordId])
      setActionError(null)
    } catch {
      setActionError('固定費の削除に失敗しました')
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <div className="max-w-md mx-auto h-[100dvh] bg-surface-subtle flex flex-col overflow-hidden">
      <ScreenHeader title="固定費履歴" onBack={() => navigate(-1)} />

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        {(isError || actionError) && (
          <div className="bg-danger-50 border border-danger-200 rounded-xl px-4 py-3 text-sm text-danger-600">
            {actionError ?? 'データの読み込みに失敗しました'}
          </div>
        )}

        {isLoading ? (
          <div className="text-center text-ink-muted text-sm py-12">読み込み中...</div>
        ) : (
          <>
            <div className="bg-surface rounded-2xl p-4 shadow-sm">
              <div className="text-sm font-semibold text-ink mb-3">
                固定費合計の推移（月額換算）
              </div>
              <ExpenseBarChart entries={chartEntries} barGap="gap-1" />
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => changeMonth(shiftMonth(month, -1))}
                className="w-9 h-9 flex items-center justify-center rounded-full text-ink-muted active:bg-surface-hover"
                aria-label="前の月"
              >
                <Chevron dir="left" />
              </button>
              <div className="min-w-[8.5rem] text-center">
                <span className="text-base font-bold text-ink-strong">{monthLabel(month)}</span>
                {month === currentMonth && (
                  <span className="ml-1.5 text-[10px] font-semibold text-primary-600">今月</span>
                )}
              </div>
              <button
                onClick={() => changeMonth(shiftMonth(month, 1))}
                disabled={month >= currentMonth}
                className="w-9 h-9 flex items-center justify-center rounded-full text-ink-muted active:bg-surface-hover disabled:opacity-30"
                aria-label="次の月"
              >
                <Chevron dir="right" />
              </button>
            </div>

            {selected ? (
              <MonthDetail
                summary={selected}
                categoryOrder={categoryOrder}
                onDelete={editable ? setDeleteTarget : undefined}
              />
            ) : (
              <div className="bg-surface rounded-2xl shadow-sm px-4 py-8 text-center text-sm text-ink-muted">
                この月の記録はありません
              </div>
            )}

            {editable ? (
              <Button variant="secondary" fullWidth onClick={openAddSheet}>
                ＋ 固定費の設定から追加
              </Button>
            ) : (
              <div className="text-xs text-ink-muted px-1">
                今月の記録は固定費の設定に合わせて自動で更新されます。過去の月は左のボタンで移動して、追加・削除できます。
              </div>
            )}
          </>
        )}
      </div>

      <BottomSheet
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        title={`${monthLabel(month)}に追加`}
        height="70dvh"
        footer={
          <Button
            fullWidth
            onClick={handleAdd}
            disabled={checkedIds.size === 0 || addMutation.isPending}
          >
            {addMutation.isPending
              ? '追加中...'
              : checkedIds.size > 0
                ? `${checkedIds.size}件を追加する`
                : '追加する'}
          </Button>
        }
      >
        <div className="pt-1">
          <p className="text-xs text-ink-muted mb-2 px-1">
            現在の固定費の設定から選びます。金額は現在の設定の月額換算です。
          </p>
          <div className="mb-3">
            <TabGroup
              tabs={STATUS_FILTER_TABS}
              active={statusFilter}
              onChange={setStatusFilter}
              size="sm"
            />
          </div>
          {visibleAddable.length === 0 ? (
            <div className="text-center py-12 text-ink-muted text-sm">
              {addable.length === 0
                ? '追加できる固定費はありません'
                : 'このステータスの固定費はありません'}
            </div>
          ) : (
            <ul className="bg-surface rounded-xl shadow-sm divide-y divide-line-subtle overflow-hidden">
              <li>
                <label className="px-4 py-3 flex items-center gap-3 active:bg-surface-hover">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    // 一部だけ選んでいるときは「－」の表示にする
                    ref={(el) => {
                      if (el) el.indeterminate = someChecked && !allChecked
                    }}
                    onChange={toggleAll}
                    className="w-5 h-5 accent-primary-500 shrink-0"
                  />
                  <span className="flex-1 text-sm font-semibold text-ink">すべて選択</span>
                  <span className="shrink-0 text-xs text-ink-muted">{visibleAddable.length}件</span>
                </label>
              </li>
              {visibleAddable.map((f) => {
                const checked = checkedIds.has(f.id)
                const status = STATUS_LABELS[f.status]
                return (
                  <li key={f.id}>
                    <label className="px-4 py-3 flex items-center gap-3 active:bg-surface-hover">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleChecked(f.id)}
                        className="w-5 h-5 accent-primary-500 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-ink truncate">{f.name}</div>
                        <div className="text-[11px] text-ink-muted">{f.category}</div>
                      </div>
                      <span
                        className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded ${status.color}`}
                      >
                        {status.label}
                      </span>
                      <span className="shrink-0 text-sm font-semibold text-ink">
                        {formatYen(toMonthlyRecord(userId, f, month).monthly_amount)}
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </BottomSheet>

      {deleteTarget && (
        <ConfirmDialog
          message={`「${deleteTarget.name}」を${monthLabel(month)}の記録から削除しますか？`}
          confirmLabel="削除する"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
