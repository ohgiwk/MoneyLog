import Card from './ui/Card'
import { useMemo, useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { STATUS_LABELS, type CategoryInfo } from '../constants'
import type { FixedExpense } from '../lib/database.types'
import type { HeaderState } from '../types/layout'
import { formatYen } from '../utils'
import { getAllCurrencyMeta } from '../lib/exchangeRate'
import { TabGroup } from './ui/TabGroup'
import FixedExpenseForm from './FixedExpenseForm'
import FixedExpenseTutorial from './FixedExpenseTutorial'
import SubscriptionPickerScreen from './SubscriptionPickerScreen'
import { type SubscriptionPreset } from '../constants'
import { AnimatePresence, motion } from 'motion/react'
import Spinner from './ui/Spinner'
import type { ReactNode } from 'react'
import FabButton from './ui/FabButton'
import PeriodToggle from './ui/PeriodToggle'
import BottomSheet from './ui/BottomSheet'

const STATUS_FILTER_TABS = [
  { key: 'active' as const, label: STATUS_LABELS.active.label },
  { key: 'unsubscribed' as const, label: STATUS_LABELS.unsubscribed.label },
  { key: 'cancelled' as const, label: STATUS_LABELS.cancelled.label },
]

interface Props {
  userId: string
  fixedExpenses: FixedExpense[]
  fixedBudget?: number
  fixedCategories: CategoryInfo[]
  reload: () => void
  onEditingChange: (state: HeaderState | null) => void
  loading?: boolean
  fromOnboarding?: boolean
  onWizardOpen?: () => void
}

export default function FixedExpenseList({
  userId,
  fixedExpenses,
  fixedBudget = 0,
  fixedCategories,
  reload,
  onEditingChange,
  loading,
  fromOnboarding,
  onWizardOpen,
}: Props) {
  const [filter, setFilter] = useState<FixedExpense['status']>('active')
  const [editing, setEditing] = useState<FixedExpense | null | 'new'>(null)
  const [showPicker, setShowPicker] = useState(false)
  const [pendingPreset, setPendingPreset] = useState<SubscriptionPreset | null>(null)
  const [formFocusSignal, setFormFocusSignal] = useState(0)
  const [tutorialOpen, setTutorialOpen] = useState(() => !!fromOnboarding)
  const [summaryPeriod, setSummaryPeriod] = useState<'monthly' | 'yearly'>('monthly')
  const [formHeaderState, setFormHeaderState] = useState<HeaderState | null>(null)
  const submitRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (fromOnboarding) onWizardOpen?.()
  }, [fromOnboarding]) // eslint-disable-line react-hooks/exhaustive-deps
  const currencyMeta = useMemo(() => getAllCurrencyMeta(), [editing, fixedExpenses])

  function openEditing(v: FixedExpense | 'new') {
    setEditing(v)
  }
  function closeEditing() {
    setShowPicker(false)
    setEditing(null)
    setFormHeaderState(null)
    onEditingChange(null)
    reload()
  }
  function openPicker() {
    setShowPicker(true)
  }
  function closePicker() {
    setShowPicker(false)
    setFormFocusSignal((n) => n + 1)
  }

  const categoryOrderMap = useMemo(
    () => new Map(fixedCategories.map((c, i) => [c.name, i])),
    [fixedCategories]
  )
  const sortByCategory = (list: FixedExpense[]) =>
    [...list].sort(
      (a, b) =>
        (categoryOrderMap.get(a.category) ?? 999) - (categoryOrderMap.get(b.category) ?? 999)
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
  const toMonthlyBaseline = (f: FixedExpense) =>
    (f.baseline_amount ?? 0) / (f.cycle === 'yearly' ? 12 : 1)
  const totalAmount = activeExpenses.reduce((s, f) => s + toMonthly(f), 0)
  const cancelledExpenses = useMemo(
    () => fixedExpenses.filter((f) => f.status === 'cancelled' && f.baseline_amount > 0),
    [fixedExpenses]
  )
  const totalSaved = cancelledExpenses.reduce((s, f) => s + toMonthlyBaseline(f), 0)

  function renderRows(list: FixedExpense[]): ReactNode[] {
    const rows: ReactNode[] = []
    let prevCategory = ''
    list.forEach((f, i) => {
      if (f.category !== prevCategory) {
        const cat = fixedCategories.find((c) => c.name === f.category)
        rows.push(
          <div
            key={`header-${f.category}-${f.status}-${i}`}
            className={`flex items-center gap-2 px-4 py-1.5 bg-surface-hover ${i > 0 ? 'border-t border-line-subtle' : ''}`}
          >
            {cat && <span className="text-sm">{cat.icon}</span>}
            <span className="text-xs font-semibold text-ink-muted">{f.category}</span>
          </div>
        )
        prevCategory = f.category
      }
      const meta = currencyMeta[f.id]
      rows.push(
        <div
          key={f.id}
          className="flex items-center px-4 py-3 gap-3 active:bg-surface-subtle cursor-pointer border-t border-line-subtle"
          onClick={() => openEditing(f)}
        >
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-ink truncate">{f.name}</div>
            {f.cycle === 'yearly' && (
              <div className="text-xs text-indigo-400 font-medium">年払い</div>
            )}
            {f.status === 'reviewing' && f.amount != null && f.amount > 0 && (
              <div className="text-xs text-warning-600 font-medium">
                解約すれば年間 {formatYen(f.cycle === 'yearly' ? f.amount : f.amount * 12)} 削減
              </div>
            )}
          </div>
          <div className="text-right shrink-0">
            {meta?.currency === 'USD' ? (
              <>
                <div className="text-sm font-semibold text-ink">
                  ${meta.usdAmount.toLocaleString()}
                  {f.cycle === 'yearly' ? '/年' : ''}
                </div>
                <div className="text-xs text-ink-muted">
                  {f.cycle === 'yearly'
                    ? `月換算 ${formatYen(Math.round((f.amount ?? 0) / 12))}`
                    : formatYen(f.amount ?? 0)}
                </div>
              </>
            ) : (
              <>
                <div
                  className={`text-sm font-semibold ${f.amount == null ? 'text-ink-subtle' : 'text-ink'}`}
                >
                  {f.amount == null
                    ? '未入力'
                    : f.cycle === 'yearly'
                      ? `${formatYen(f.amount)}/年`
                      : formatYen(f.amount)}
                </div>
                {f.cycle === 'yearly' && f.amount != null && (
                  <div className="text-xs text-ink-muted">
                    月換算 {formatYen(Math.round(f.amount / 12))}
                  </div>
                )}
              </>
            )}
          </div>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_LABELS[f.status].color}`}
          >
            {STATUS_LABELS[f.status].label}
          </span>
        </div>
      )
    })
    return rows
  }

  const content: ReactNode = (
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
      <div className="bg-surface rounded-2xl p-4 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="text-sm font-semibold text-ink mb-1">
            固定費合計（{summaryPeriod === 'monthly' ? '月額' : '年額'}換算）
          </div>
          <PeriodToggle value={summaryPeriod} onChange={setSummaryPeriod} />
        </div>
        <div className="text-2xl font-bold text-ink">
          {formatYen(summaryPeriod === 'monthly' ? totalAmount : totalAmount * 12)}
          <span className="text-sm font-normal text-ink-muted">
            {summaryPeriod === 'monthly' ? '/月' : '/年'}
          </span>
        </div>
        {totalSaved > 0 && (
          <div className="text-xs text-primary-600 font-semibold mt-1">
            初回登録時より -{formatYen(totalSaved)}/月（年間 -{formatYen(totalSaved * 12)}）
          </div>
        )}
        {fixedBudget > 0 && (
          <div className="text-xs text-ink-muted mt-1">
            予算 {formatYen(summaryPeriod === 'monthly' ? fixedBudget : fixedBudget * 12)}
            {' / 差額 '}
            <span
              className={
                (summaryPeriod === 'monthly'
                  ? fixedBudget - totalAmount
                  : (fixedBudget - totalAmount) * 12) < 0
                  ? 'text-danger-500 font-semibold'
                  : 'text-primary-600 font-semibold'
              }
            >
              {formatYen(
                summaryPeriod === 'monthly'
                  ? fixedBudget - totalAmount
                  : (fixedBudget - totalAmount) * 12
              )}
            </span>
          </div>
        )}
      </div>

      {/* フィルター */}
      <div className="py-4">
        <TabGroup tabs={STATUS_FILTER_TABS} active={filter} onChange={setFilter} size="sm" />
      </div>

      {/* 固定費一覧 */}
      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <Card>
          <div className="text-sm text-ink-muted text-center py-6">該当する固定費がありません</div>
        </Card>
      ) : filter === 'active' ? (
        (() => {
          const reviewingList = filtered.filter((f) => f.status === 'reviewing')
          const activeList = filtered.filter((f) => f.status === 'active')
          return (
            <div className="space-y-3">
              {reviewingList.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-warning-600 px-1 pb-1">見直し中</div>
                  <Card>{renderRows(reviewingList)}</Card>
                </div>
              )}
              {activeList.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-ink-muted px-1 pb-1">契約中</div>
                  <Card>{renderRows(activeList)}</Card>
                </div>
              )}
            </div>
          )
        })()
      ) : (
        <Card>{renderRows(filtered)}</Card>
      )}

      <div className="h-24" />

      {/* FAB */}
      <div className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] left-0 right-0 max-w-md mx-auto flex justify-end pr-5 pointer-events-none z-20">
        <FabButton onClick={() => openEditing('new')} ariaLabel="固定費を追加" />
      </div>
    </>
  )

  return (
    <>
      {content}

      {/* 固定費入力ボトムシート */}
      <BottomSheet
        isOpen={editing !== null}
        onClose={formHeaderState?.onBack ?? closeEditing}
        title={formHeaderState?.title ?? (editing === 'new' ? '固定費を追加' : '固定費を編集')}
        rightAction={
          formHeaderState?.action
            ? {
                onClick: formHeaderState.action.onClick,
                disabled: formHeaderState.action.disabled,
                tone: 'danger',
              }
            : undefined
        }
        footer={
          <button
            type="button"
            onClick={() => submitRef.current?.()}
            className="w-full py-3.5 text-base rounded-[2rem] shadow-lg bg-primary-500 active:bg-primary-600 text-white font-semibold"
          >
            保存する
          </button>
        }
      >
        {editing !== null && (
          <FixedExpenseForm
            key={editing === 'new' ? 'new' : editing.id}
            userId={userId}
            expense={editing === 'new' ? undefined : editing}
            fixedCategories={fixedCategories}
            onClose={closeEditing}
            onOpenSubscriptionPicker={openPicker}
            presetToApply={pendingPreset}
            onPresetApplied={() => setPendingPreset(null)}
            focusSignal={formFocusSignal}
            onHeaderChange={setFormHeaderState}
            submitRef={submitRef}
          />
        )}
      </BottomSheet>

      {createPortal(
        <AnimatePresence>
          {showPicker && (
            <motion.div
              key="picker"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ x: { type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.32 } }}
              className="fixed inset-0 max-w-md mx-auto bg-surface-subtle overflow-y-auto z-[100]"
            >
              <SubscriptionPickerScreen
                onSelect={(preset) => {
                  setPendingPreset(preset)
                  closePicker()
                }}
                onBack={closePicker}
              />
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}
