import { useMemo, useState, useEffect } from 'react'
import { STATUS_LABELS, type CategoryInfo } from '../constants'
import type { FixedExpense } from '../lib/database.types'
import { formatYen } from '../utils'
import { getAllCurrencyMeta } from '../lib/exchangeRate'
import { TabGroup } from './ui/TabGroup'
import FixedExpenseForm from './FixedExpenseForm'
import FixedExpenseTutorial from './FixedExpenseTutorial'
import Spinner from './ui/Spinner'
import type { ReactNode } from 'react'

const STATUS_FILTER_TABS = [
  { key: 'active' as const, label: STATUS_LABELS.active.label },
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
  fromOnboarding?: boolean
  onWizardOpen?: () => void
}

export default function FixedExpenseList({
  userId,
  fixedExpenses,
  fixedCategories,
  reload,
  onEditingChange,
  loading,
  fromOnboarding,
  onWizardOpen,
}: Props) {
  const [filter, setFilter] = useState<FixedExpense['status']>('active')
  const [editing, setEditing] = useState<FixedExpense | null | 'new'>(null)
  const [tutorialOpen, setTutorialOpen] = useState(false)

  useEffect(() => {
    if (fromOnboarding) {
      setTutorialOpen(true)
      onWizardOpen?.()
    }
  }, [fromOnboarding])
  const currencyMeta = useMemo(() => getAllCurrencyMeta(), [editing, fixedExpenses])

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
  const sortByCategory = (list: FixedExpense[]) =>
    [...list].sort(
      (a, b) => (categoryOrderMap.get(a.category) ?? 999) - (categoryOrderMap.get(b.category) ?? 999)
    )

  const filtered = useMemo(
    () =>
      filter === 'active'
        ? [
            ...sortByCategory(fixedExpenses.filter((f) => f.status === 'reviewing')),
            ...sortByCategory(fixedExpenses.filter((f) => f.status === 'active')),
          ]
        : sortByCategory(fixedExpenses.filter((f) => f.status === filter)),
    [fixedExpenses, filter, categoryOrderMap]
  )
  const activeExpenses = useMemo(
    () => fixedExpenses.filter((f) => f.status === 'active' || f.status === 'reviewing'),
    [fixedExpenses]
  )
  const toMonthly = (f: FixedExpense) => (f.amount ?? 0) / (f.cycle === 'yearly' ? 12 : 1)
  const toMonthlyBaseline = (f: FixedExpense) => (f.baseline_amount ?? 0) / (f.cycle === 'yearly' ? 12 : 1)
  const totalAmount = activeExpenses.reduce((s, f) => s + toMonthly(f), 0)
  const cancelledExpenses = useMemo(
    () => fixedExpenses.filter((f) => f.status === 'cancelled' && f.baseline_amount > 0),
    [fixedExpenses]
  )
  const totalSaved = cancelledExpenses.reduce((s, f) => s + toMonthlyBaseline(f), 0)

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
      {loading ? <Spinner /> : (filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="text-sm text-slate-400 text-center py-6">該当する固定費がありません</div>
        </div>
      ) : filter === 'active' ? (
        (() => {
          const reviewingList = filtered.filter((f) => f.status === 'reviewing')
          const activeList = filtered.filter((f) => f.status === 'active')
          const renderGroup = (list: FixedExpense[]) => {
            const rows: ReactNode[] = []
            let prevCategory = ''
            list.forEach((f, i) => {
              if (f.category !== prevCategory) {
                const cat = fixedCategories.find((c) => c.name === f.category)
                rows.push(
                  <div
                    key={`header-${f.category}-${f.status}`}
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
                    {f.status === 'reviewing' && f.amount != null && f.amount > 0 && (
                      <div className="text-xs text-amber-600 font-medium">
                        解約すれば年間 {formatYen(f.cycle === 'yearly' ? f.amount : f.amount * 12)} 削減
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {(() => {
                      const meta = currencyMeta[f.id]
                      if (meta?.currency === 'USD') {
                        return (
                          <>
                            <div className="text-sm font-semibold text-slate-700">
                              ${meta.usdAmount.toLocaleString()}
                              {f.cycle === 'yearly' ? '/年' : ''}
                            </div>
                            <div className="text-xs text-slate-400">
                              {f.cycle === 'yearly'
                                ? `月換算 ${formatYen(Math.round((f.amount ?? 0) / 12))}`
                                : formatYen(f.amount ?? 0)}
                            </div>
                          </>
                        )
                      }
                      return (
                        <>
                          <div className={`text-sm font-semibold ${f.amount == null ? 'text-slate-300' : 'text-slate-700'}`}>
                            {f.amount == null ? '未入力' : f.cycle === 'yearly' ? `${formatYen(f.amount)}/年` : formatYen(f.amount)}
                          </div>
                          {f.cycle === 'yearly' && f.amount != null && (
                            <div className="text-xs text-slate-400">月換算 {formatYen(Math.round(f.amount / 12))}</div>
                          )}
                          {f.cycle !== 'yearly' && f.baseline_amount > 0 && f.amount != null && f.baseline_amount > f.amount && (
                            <div className="text-xs text-emerald-500">-{formatYen(f.baseline_amount - f.amount)}</div>
                          )}
                        </>
                      )
                    })()}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_LABELS[f.status].color}`}>
                    {STATUS_LABELS[f.status].label}
                  </span>
                  <span className="text-slate-300 text-sm">›</span>
                </div>
              )
            })
            return rows
          }
          return (
            <div className="space-y-3">
              {reviewingList.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-amber-600 px-1 pb-1">見直し中</div>
                  <div className="bg-white rounded-2xl shadow-sm overflow-hidden">{renderGroup(reviewingList)}</div>
                </div>
              )}
              {activeList.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-400 px-1 pb-1">契約中</div>
                  <div className="bg-white rounded-2xl shadow-sm overflow-hidden">{renderGroup(activeList)}</div>
                </div>
              )}
            </div>
          )
        })()
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {((() => {
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
                    {(() => {
                      const meta = currencyMeta[f.id]
                      if (meta?.currency === 'USD') {
                        return (
                          <>
                            <div className="text-sm font-semibold text-slate-700">
                              ${meta.usdAmount.toLocaleString()}
                              {f.cycle === 'yearly' ? '/年' : ''}
                            </div>
                            <div className="text-xs text-slate-400">
                              {f.cycle === 'yearly'
                                ? `月換算 ${formatYen(Math.round((f.amount ?? 0) / 12))}`
                                : formatYen(f.amount ?? 0)}
                            </div>
                          </>
                        )
                      }
                      return (
                        <>
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
                        </>
                      )
                    })()}
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
        </div>
      ))}

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
