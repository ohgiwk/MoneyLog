import { useState } from 'react'
import { CONSUMABLE_URGENT_THRESHOLD_DAYS, CONSUMABLE_CATEGORIES, DEFAULT_CONSUMABLES, type DefaultConsumable } from '../constants'
import { EXPENSE_CATEGORIES } from '../constants'
import type { Consumable } from '../lib/database.types'
import { formatYen, nextPurchaseDate, daysUntil, monthlyConsumableCost } from '../utils'
import { consumableService } from '../lib/services/consumableService'
import { transactionService } from '../lib/services/transactionService'
import ConsumableRow from './ConsumableRow'
import ConsumableForm from './ConsumableForm'
import ConsumablePurchaseDialog from './ConsumablePurchaseDialog'
import Spinner from './ui/Spinner'

interface Props {
  userId: string
  consumables: Consumable[]
  householdMembers: number
  reload: () => void
  onEditingChange: (editing: boolean) => void
  loading?: boolean
  onTransactionAdded?: () => void
}

type EditingState = Consumable | null | 'new' | { preset: DefaultConsumable }

export default function ConsumablesList({
  userId,
  consumables,
  householdMembers,
  reload,
  onEditingChange,
  loading,
  onTransactionAdded,
}: Props) {
  const [editing, setEditing] = useState<EditingState>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [purchasing, setPurchasing] = useState<Consumable | null>(null)

  function openEditing(v: Consumable | 'new' | { preset: DefaultConsumable }) {
    setEditing(v)
    onEditingChange(true)
  }
  function closeEditing() {
    setEditing(null)
    onEditingChange(false)
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
  const byCategory = CONSUMABLE_CATEGORIES.map((cat) => ({
    cat,
    items: rest.filter((c) => c.category === cat.name),
  })).filter((g) => g.items.length > 0)

  // その他（未知カテゴリ）
  const knownCategoryNames = new Set(CONSUMABLE_CATEGORIES.map((c) => c.name))
  const uncategorized = rest.filter((c) => !knownCategoryNames.has(c.category))

  const totalMonthly = consumables.reduce(
    (s, c) => s + monthlyConsumableCost(c, householdMembers),
    0
  )

  // 未登録のデフォルト品目
  const registeredNames = new Set(consumables.map((c) => c.name))
  const unregisteredDefaults = DEFAULT_CONSUMABLES.filter((d) => !registeredNames.has(d.name))
  const suggestionsByCategory = CONSUMABLE_CATEGORIES.map((cat) => ({
    cat,
    items: unregisteredDefaults.filter((d) => d.category === cat.name),
  })).filter((g) => g.items.length > 0)

  if (editing !== null) {
    const isPreset = typeof editing === 'object' && editing !== null && 'preset' in (editing as object)
    return (
      <ConsumableForm
        userId={userId}
        consumable={isPreset || editing === 'new' ? undefined : editing as Consumable}
        preset={isPreset ? (editing as { preset: DefaultConsumable }).preset : undefined}
        householdMembers={householdMembers}
        onClose={closeEditing}
      />
    )
  }

  return (
    <>
      {/* 月額コストサマリー */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="text-sm font-semibold text-slate-700 mb-1">定期購入合計（月額換算）</div>
        <div className="text-2xl font-bold text-slate-700">
          {formatYen(totalMonthly)}
          <span className="text-sm font-normal text-slate-400">/月</span>
        </div>
        <div className="text-xs text-slate-400 mt-1">同居人数: {householdMembers}人</div>
      </div>

      {loading && <Spinner />}

      {/* そろそろ買い時 */}
      {!loading && urgent.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-amber-600 mb-2 flex items-center gap-1">
            <span>⚠️</span> そろそろ買い時（7日以内）
          </div>
          <div className="space-y-1.5">
            {urgent.map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <div className="flex-1 bg-white rounded-2xl shadow-sm overflow-hidden">
                  <ConsumableRow
                    consumable={c}
                    householdMembers={householdMembers}
                    onClick={() => openEditing(c)}
                    border={false}
                    urgent
                  />
                </div>
                <button
                  onClick={() => setPurchasing(c)}
                  className="shrink-0 w-8 self-stretch rounded-xl bg-emerald-50 text-emerald-600 text-xs font-medium border border-emerald-200 active:bg-emerald-100 [writing-mode:vertical-rl] tracking-widest"
                >
                  購入済
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* カテゴリ別一覧 */}
      {!loading && byCategory.map(({ cat, items }) => (
        <div key={cat.name}>
          <div className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
            <span>{cat.icon}</span>
            <span>{cat.name}</span>
          </div>
          <div className="space-y-1.5">
            {items.map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <div className="flex-1 bg-white rounded-2xl shadow-sm overflow-hidden">
                  <ConsumableRow
                    consumable={c}
                    householdMembers={householdMembers}
                    onClick={() => openEditing(c)}
                    border={false}
                  />
                </div>
                <button
                  onClick={() => setPurchasing(c)}
                  className="shrink-0 w-8 self-stretch rounded-xl bg-emerald-50 text-emerald-600 text-xs font-medium border border-emerald-200 active:bg-emerald-100 [writing-mode:vertical-rl] tracking-widest"
                >
                  購入済
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* 未知カテゴリ */}
      {!loading && uncategorized.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-slate-400 mb-2">その他</div>
          <div className="space-y-1.5">
            {uncategorized.map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <div className="flex-1 bg-white rounded-2xl shadow-sm overflow-hidden">
                  <ConsumableRow
                    consumable={c}
                    householdMembers={householdMembers}
                    onClick={() => openEditing(c)}
                    border={false}
                  />
                </div>
                <button
                  onClick={() => setPurchasing(c)}
                  className="shrink-0 w-8 self-stretch rounded-xl bg-emerald-50 text-emerald-600 text-xs font-medium border border-emerald-200 active:bg-emerald-100 [writing-mode:vertical-rl] tracking-widest"
                >
                  購入済
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && consumables.length === 0 && (
        <div className="text-sm text-slate-400 text-center py-4">登録された定期購入がありません</div>
      )}

      {/* FAB */}
      <div className="fixed bottom-24 left-0 right-0 max-w-md mx-auto flex justify-end pr-5 pointer-events-none z-20">
        <button
          onClick={() => openEditing('new')}
          className="pointer-events-auto w-14 h-14 rounded-full bg-emerald-500 text-white shadow-lg active:bg-emerald-600 flex items-center justify-center"
          aria-label="定期購入を追加"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {/* おすすめ品目 */}
      {purchasing && (
        <ConsumablePurchaseDialog
          consumable={purchasing}
          householdMembers={householdMembers}
          expenseCategories={EXPENSE_CATEGORIES}
          onConfirm={handlePurchaseConfirm}
          onCancel={() => setPurchasing(null)}
        />
      )}

      {unregisteredDefaults.length > 0 && (
        <div>
          <button
            onClick={() => setShowSuggestions((v) => !v)}
            className="w-full flex items-center justify-between text-xs font-semibold text-slate-400 mb-2 py-1"
          >
            <span>おすすめ品目（未登録）</span>
            <span>{showSuggestions ? '▲' : '▼'}</span>
          </button>

          {showSuggestions && (
            <div className="space-y-3">
              {suggestionsByCategory.map(({ cat, items }) => (
                <div key={cat.name}>
                  <div className="text-xs text-slate-400 mb-1.5 flex items-center gap-1">
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {items.map((d) => (
                      <button
                        key={d.name}
                        onClick={() => openEditing({ preset: d })}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-600 active:bg-slate-50 flex items-center gap-1"
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
