import { useState } from 'react'
import type { Consumable } from '../lib/database.types'
import { formatYen, nextPurchaseDate, daysUntil, monthlyConsumableCost } from '../utils'
import ConsumableRow from './ConsumableRow'
import ConsumableForm from './ConsumableForm'

const URGENT_THRESHOLD_DAYS = 7

interface Props {
  userId: string
  consumables: Consumable[]
  householdMembers: number
  reload: () => void
  onEditingChange: (editing: boolean) => void
}

export default function ConsumablesList({
  userId,
  consumables,
  householdMembers,
  reload,
  onEditingChange,
}: Props) {
  const [editing, setEditing] = useState<Consumable | null | 'new'>(null)

  function openEditing(v: Consumable | 'new') {
    setEditing(v)
    onEditingChange(true)
  }
  function closeEditing() {
    setEditing(null)
    onEditingChange(false)
    reload()
  }

  const sorted = [...consumables].sort(
    (a, b) =>
      nextPurchaseDate(a, householdMembers).getTime() -
      nextPurchaseDate(b, householdMembers).getTime()
  )
  const urgent = sorted.filter(
    (c) => daysUntil(nextPurchaseDate(c, householdMembers)) <= URGENT_THRESHOLD_DAYS
  )
  const rest = sorted.filter(
    (c) => daysUntil(nextPurchaseDate(c, householdMembers)) > URGENT_THRESHOLD_DAYS
  )

  const totalMonthly = consumables.reduce(
    (s, c) => s + monthlyConsumableCost(c, householdMembers),
    0
  )

  if (editing !== null) {
    return (
      <ConsumableForm
        userId={userId}
        consumable={editing === 'new' ? undefined : editing}
        householdMembers={householdMembers}
        onClose={closeEditing}
      />
    )
  }

  return (
    <>
      {/* 月額コストサマリー */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="text-sm font-semibold text-slate-700 mb-1">消耗品費（月額換算）</div>
        <div className="text-2xl font-bold text-slate-700">
          {formatYen(totalMonthly)}
          <span className="text-sm font-normal text-slate-400">/月</span>
        </div>
        <div className="text-xs text-slate-400 mt-1">同居人数: {householdMembers}人</div>
      </div>

      {/* そろそろ買い時 */}
      {urgent.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-amber-600 mb-2 flex items-center gap-1">
            <span>⚠️</span> そろそろ買い時（7日以内）
          </div>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {urgent.map((c, i) => (
              <ConsumableRow
                key={c.id}
                consumable={c}
                householdMembers={householdMembers}
                onClick={() => openEditing(c)}
                border={i > 0}
                urgent
              />
            ))}
          </div>
        </div>
      )}

      {/* すべての品目 */}
      {rest.length > 0 && (
        <div>
          {urgent.length > 0 && (
            <div className="text-xs font-semibold text-slate-400 mb-2">その他の品目</div>
          )}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {rest.map((c, i) => (
              <ConsumableRow
                key={c.id}
                consumable={c}
                householdMembers={householdMembers}
                onClick={() => openEditing(c)}
                border={i > 0}
              />
            ))}
          </div>
        </div>
      )}

      {consumables.length === 0 && (
        <div className="text-sm text-slate-400 text-center py-4">登録された消耗品がありません</div>
      )}

      <button
        onClick={() => openEditing('new')}
        className="w-full py-3 rounded-xl border-2 border-dashed border-slate-200 text-sm text-slate-400 font-semibold active:bg-slate-50"
      >
        + 消耗品を追加
      </button>
    </>
  )
}
