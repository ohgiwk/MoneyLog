import Card from './ui/Card'
import { useState, type ReactNode } from 'react'
import { IconShoppingCartCopy } from '@tabler/icons-react'
import { CONSUMABLE_URGENT_THRESHOLD_DAYS, DEFAULT_CONSUMABLES, type CategoryInfo, type DefaultConsumable } from '../constants'
import type { Consumable } from '../lib/database.types'
import type { HeaderState } from '../types/layout'
import { formatYen, nextPurchaseDate, daysUntil, monthlyConsumableCost } from '../utils'
import { consumableService } from '../lib/services/consumableService'
import { transactionService } from '../lib/services/transactionService'
import ConsumableRow from './ConsumableRow'
import ConsumableForm from './ConsumableForm'
import ConsumablePurchaseDialog from './ConsumablePurchaseDialog'
import Spinner from './ui/Spinner'
import PageTransition, { type NavDirection } from './PageTransition'
import FabButton from './ui/FabButton'
import PeriodToggle from './ui/PeriodToggle'

interface Props {
  userId: string
  consumables: Consumable[]
  householdMembers: number
  expenseCategories: CategoryInfo[]
  reload: () => void
  onEditingChange: (state: HeaderState | null) => void
  loading?: boolean
  onTransactionAdded?: () => void
}

type EditingState = Consumable | null | 'new' | { preset: DefaultConsumable }

export default function ConsumablesList({
  userId,
  consumables,
  householdMembers,
  expenseCategories,
  reload,
  onEditingChange,
  loading,
  onTransactionAdded,
}: Props) {
  const [editing, setEditing] = useState<EditingState>(null)
  const [direction, setDirection] = useState<NavDirection>('forward')
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [purchasing, setPurchasing] = useState<Consumable | null>(null)
  const [summaryPeriod, setSummaryPeriod] = useState<'monthly' | 'yearly'>('monthly')

  function openEditing(v: Consumable | 'new' | { preset: DefaultConsumable }) {
    setDirection('forward')
    setEditing(v)
  }
  function closeEditing() {
    setDirection('back')
    setEditing(null)
    onEditingChange(null)
    reload()
  }

  async function handlePurchaseConfirm(date: string, category: string, amount: number, memo: string) {
    if (!purchasing) return
    await transactionService.insert({
      user_id: userId,
      type: 'expense',
      expense_kind: 'one_time',
      date,
      category,
      amount,
      memo: memo || null,
      store_type: null,
      meal_type: null,
      payment_type: null,
      payment_method: null,
      recurring_rule_id: null,
    })
    await consumableService.update(purchasing.id, { last_purchased: date })
    setPurchasing(null)
    reload()
    onTransactionAdded?.()
  }

  const sorted = [...consumables].sort(
    (a, b) =>
      nextPurchaseDate(a, householdMembers).getTime() -
      nextPurchaseDate(b, householdMembers).getTime()
  )
  const urgent = sorted.filter(
    (c) => daysUntil(nextPurchaseDate(c, householdMembers)) <= CONSUMABLE_URGENT_THRESHOLD_DAYS
  )
  const rest = sorted.filter(
    (c) => daysUntil(nextPurchaseDate(c, householdMembers)) > CONSUMABLE_URGENT_THRESHOLD_DAYS
  )

  // カテゴリ別グループ化
  const byCategory = expenseCategories.map((cat) => ({
    cat,
    items: rest.filter((c) => c.category === cat.name),
  })).filter((g) => g.items.length > 0)

  // その他（未知カテゴリ）
  const knownCategoryNames = new Set(expenseCategories.map((c) => c.name))
  const uncategorized = rest.filter((c) => !knownCategoryNames.has(c.category))

  const totalMonthly = consumables.reduce(
    (s, c) => s + monthlyConsumableCost(c, householdMembers),
    0
  )

  // 未登録のデフォルト品目
  const registeredNames = new Set(consumables.map((c) => c.name))
  const unregisteredDefaults = DEFAULT_CONSUMABLES.filter((d) => !registeredNames.has(d.name))
  const suggestionsByCategory = expenseCategories.map((cat) => ({
    cat,
    items: unregisteredDefaults.filter((d) => d.category === cat.name),
  })).filter((g) => g.items.length > 0)

  function renderConsumableItem(c: Consumable, urgent?: boolean) {
    return (
      <div key={c.id} className="flex items-center gap-2">
        <Card className="flex-1">
          <ConsumableRow
            consumable={c}
            householdMembers={householdMembers}
            onClick={() => openEditing(c)}
            border={false}
            urgent={urgent}
          />
        </Card>
        <button
          onClick={() => setPurchasing(c)}
          className="shrink-0 w-8 self-stretch rounded-xl bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-900 active:bg-primary-100 dark:active:bg-primary-900/60 flex flex-col items-center justify-center gap-0.5"
          title="購入済"
        >
          <IconShoppingCartCopy size={20} />
        </button>
      </div>
    )
  }

  let content: ReactNode

  if (editing !== null) {
    const isPreset = typeof editing === 'object' && editing !== null && 'preset' in (editing as object)
    content = (
      <div className="-m-4 p-4 min-h-screen bg-surface-subtle">
        <ConsumableForm
          userId={userId}
          consumable={isPreset || editing === 'new' ? undefined : editing as Consumable}
          preset={isPreset ? (editing as { preset: DefaultConsumable }).preset : undefined}
          householdMembers={householdMembers}
          expenseCategories={expenseCategories}
          onClose={closeEditing}
          onHeaderChange={onEditingChange}
        />
      </div>
    )
  } else {
    content = (
    <>
      {/* 月額/年額コストサマリー */}
      <div className="bg-surface rounded-2xl p-4 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="text-sm font-semibold text-ink mb-1">
            定期購入合計（{summaryPeriod === 'monthly' ? '月額' : '年額'}換算）
          </div>
          <PeriodToggle value={summaryPeriod} onChange={setSummaryPeriod} />
        </div>
        <div className="text-2xl font-bold text-ink">
          {formatYen(summaryPeriod === 'monthly' ? totalMonthly : totalMonthly * 12)}
          <span className="text-sm font-normal text-ink-muted">
            {summaryPeriod === 'monthly' ? '/月' : '/年'}
          </span>
        </div>
      </div>

      {loading && <Spinner />}

      {/* そろそろ買い時 */}
      {!loading && urgent.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-warning-600 mt-2 mb-2 flex items-center gap-1">
            <span>⚠️</span> そろそろ買い時（7日以内）
          </div>
          <div className="space-y-1.5">
            {urgent.map((c) => renderConsumableItem(c, true))}
          </div>
        </div>
      )}

      {/* カテゴリ別一覧 */}
      {!loading && byCategory.map(({ cat, items }) => (
        <div key={cat.name}>
          <div className="text-xs font-semibold text-ink-muted mt-2 mb-2 flex items-center gap-1.5">
            <span>{cat.icon}</span>
            <span>{cat.name}</span>
          </div>
          <div className="space-y-1.5">
            {items.map((c) => renderConsumableItem(c))}
          </div>
        </div>
      ))}

      {/* 未知カテゴリ */}
      {!loading && uncategorized.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-ink-muted mt-2 mb-2">その他</div>
          <div className="space-y-1.5">
            {uncategorized.map((c) => renderConsumableItem(c))}
          </div>
        </div>
      )}

      {!loading && consumables.length === 0 && (
        <div className="text-sm text-ink-muted text-center py-4">登録された定期購入がありません</div>
      )}

      {/* FAB */}
      <div className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] left-0 right-0 max-w-md mx-auto flex justify-end pr-5 pointer-events-none z-20">
        <FabButton onClick={() => openEditing('new')} ariaLabel="定期購入を追加" />
      </div>

      {/* おすすめ品目 */}
      {purchasing && (
        <ConsumablePurchaseDialog
          consumable={purchasing}
          householdMembers={householdMembers}
          expenseCategories={expenseCategories}
          onConfirm={handlePurchaseConfirm}
          onCancel={() => setPurchasing(null)}
        />
      )}

      {unregisteredDefaults.length > 0 && (
        <div>
          <button
            onClick={() => setShowSuggestions((v) => !v)}
            className="w-full flex items-center justify-between text-xs font-semibold text-ink-muted mt-2 mb-2 py-1"
          >
            <span>おすすめ品目（未登録）</span>
            <span>{showSuggestions ? '▲' : '▼'}</span>
          </button>

          {showSuggestions && (
            <div className="space-y-3">
              {suggestionsByCategory.map(({ cat, items }) => (
                <div key={cat.name}>
                  <div className="text-xs text-ink-muted mb-1.5 flex items-center gap-1">
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {items.map((d) => (
                      <button
                        key={d.name}
                        onClick={() => openEditing({ preset: d })}
                        className="px-3 py-1.5 rounded-xl border border-line bg-surface text-xs text-ink active:bg-surface-subtle flex items-center gap-1"
                      >
                        <span>+</span>
                        <span>{d.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
    )
  }

  return (
    <PageTransition pageKey={editing !== null ? 'form' : 'list'} direction={direction}>
      {content}
    </PageTransition>
  )
}
