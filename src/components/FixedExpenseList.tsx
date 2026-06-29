import { useMemo, useState } from 'react'
import { STATUS_LABELS, type CategoryInfo } from '../constants'
import type { FixedExpense } from '../lib/database.types'
import { formatYen } from '../utils'
import { TabGroup } from './ui/TabGroup'
import FixedExpenseForm from './FixedExpenseForm'
import FixedExpenseTutorial from './FixedExpenseTutorial'
import Spinner from './ui/Spinner'
import type { ReactNode } from 'react'

const STATUS_FILTER_TABS = [
  { key: 'active' as const, label: STATUS_LABELS.active.label },
  { key: 'reviewing' as const, label: STATUS_LABELS.reviewing.label },
  { key: 'unsubscribed' as const, label: STATUS_LABELS.unsubscribed.label },
  { key: 'cancelled' as const, label: STATUS_LABELS.cancelled.label },
]

interface Props {
  userId: string
  fixedExpenses: FixedExpense[]
  fixedCategories: CategoryInfo[]
  reload: () => void
  onEditingChange: (editing: boolean) => void
  loading?: boolean
}

export default function FixedExpenseList({
  userId,
  fixedExpenses,
  fixedCategories,
  reload,
  onEditingChange,
  loading,
}: Props) {
  const [filter, setFilter] = useState<FixedExpense['status']>('active')
  const [editing, setEditing] = useState<FixedExpense | null | 'new'>(null)
  const [tutorialOpen, setTutorialOpen] = useState(false)

  function openEditing(v: FixedExpense | 'new') {
    setEditing(v)
    onEditingChange(true)
  }
  function closeEditing() {
    setEditing(null)
    onEditingChange(false)
    reload()
  }

  const categoryOrderMap = useMemo(
    () => new Map(fixedCategories.map((c, i) => [c.name, i])),
    [fixedCategories]
  )
  const filtered = useMemo(
    () =>
      fixedExpenses
        .filter((f) => f.status === filter)
        .sort(
          (a, b) =>
            (categoryOrderMap.get(a.category) ?? 999) - (categoryOrderMap.get(b.category) ?? 999)
        ),
    [fixedExpenses, filter, categoryOrderMap]
  )
  const activeExpenses = useMemo(
    () => fixedExpenses.filter((f) => f.status === 'active' || f.status === 'reviewing'),
    [fixedExpenses]
  )
  const toMonthly = (f: FixedExpense) => (f.amount ?? 0) / (f.cycle === 'yearly' ? 12 : 1)
  const totalAmount = activeExpenses.reduce((s, f) => s + toMonthly(f), 0)
  const totalBaseline = activeExpenses
    .filter((f) => f.baseline_amount > 0)
    .reduce((s, f) => s + f.baseline_amount / (f.cycle === 'yearly' ? 12 : 1), 0)
  const totalCurrent = activeExpenses
    .filter((f) => f.baseline_amount > 0)
    .reduce((s, f) => s + toMonthly(f), 0)
  const totalSaved = totalBaseline - totalCurrent

  if (editing !== null) {
    return (
      <FixedExpenseForm
        userId={userId}
        expense={editing === 'new' ? undefined : editing}
        fixedCategories={fixedCategories}
        onClose={closeEditing}
      />
    )
  }

  return (
    <>
      {tutorialOpen && (
        <FixedExpenseTutorial
          userId={userId}
          fixedExpenses={fixedExpenses}
          onClose={() => setTutorialOpen(false)}
          onComplete={() => {
            setTutorialOpen(false)
            reload()
          }}
        />
      )}

      {/* 節約サマリー */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="text-sm font-semibold text-slate-700 mb-1">固定費合計（月額換算）</div>
        <div className="text-2xl font-bold text-slate-700">
          {formatYen(totalAmount)}
          <span className="text-sm font-normal text-slate-400">/月</span>
        </div>
        {totalSaved > 0 && (
          <div className="text-xs text-emerald-600 font-semibold mt-1">
            初回登録時より -{formatYen(totalSaved)}/月（年間 -{formatYen(totalSaved * 12)}）
          </div>
        )}
      </div>

      {/* フィルター */}
      <TabGroup tabs={STATUS_FILTER_TABS} active={filter} onChange={setFilter} size="sm" />

      {/* 固定費一覧 */}
      {loading ? <Spinner /> : <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-sm text-slate-400 text-center py-6">該当する固定費がありません</div>
        ) : (
          (() => {
            const rows: ReactNode[] = []
            let prevCategory = ''
            filtered.forEach((f, i) => {
              if (f.category !== prevCategory) {
                const cat = fixedCategories.find((c) => c.name === f.category)
                rows.push(
                  <div
                    key={`header-${f.category}`}
                    className={`flex items-center gap-2 px-4 py-1.5 bg-slate-50 ${i > 0 ? 'border-t border-slate-100' : ''}`}
                  >
                    {cat && <span className="text-sm">{cat.icon}</span>}
                    <span className="text-xs font-semibold text-slate-400">{f.category}</span>
                  </div>
                )
                prevCategory = f.category
              }
              rows.push(
                <div
                  key={f.id}
                  className="flex items-center px-4 py-3 gap-3 active:bg-slate-50 cursor-pointer border-t border-slate-50"
                  onClick={() => openEditing(f)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-700 truncate">{f.name}</div>
                    {f.cycle === 'yearly' && (
                      <div className="text-xs text-indigo-400 font-medium">年払い</div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div
                      className={`text-sm font-semibold ${f.amount == null ? 'text-slate-300' : 'text-slate-700'}`}
                    >
                      {f.amount == null
                        ? '未入力'
                        : f.cycle === 'yearly'
                          ? `${formatYen(f.amount)}/年`
                          : formatYen(f.amount)}
                    </div>
                    {f.cycle === 'yearly' && f.amount != null && (
                      <div className="text-xs text-slate-400">
                        月換算 {formatYen(Math.round(f.amount / 12))}
                      </div>
                    )}
                    {f.cycle !== 'yearly' &&
                      f.baseline_amount > 0 &&
                      f.amount != null &&
                      f.baseline_amount > f.amount && (
                        <div className="text-xs text-emerald-500">
                          -{formatYen(f.baseline_amount - f.amount)}
                        </div>
                      )}
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_LABELS[f.status].color}`}
                  >
                    {STATUS_LABELS[f.status].label}
                  </span>
                  <span className="text-slate-300 text-sm">›</span>
                </div>
              )
            })
            return rows
          })()
        )}
      </div>}

      <button
        onClick={() => setTutorialOpen(true)}
        className="w-full py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-500 font-medium active:bg-slate-50 flex items-center justify-center gap-2"
      >
        <span>🧭</span> 初期設定ウィザードを起動
      </button>

      {/* FAB */}
      <div className="fixed bottom-24 left-0 right-0 max-w-md mx-auto flex justify-end pr-5 pointer-events-none z-20">
        <button
          onClick={() => openEditing('new')}
          className="pointer-events-auto w-14 h-14 rounded-full bg-emerald-500 text-white shadow-lg active:bg-emerald-600 flex items-center justify-center"
          aria-label="固定費を追加"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>
    </>
  )
}
