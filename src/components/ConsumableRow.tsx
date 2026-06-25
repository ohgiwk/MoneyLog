import { CONSUMABLE_CATEGORIES } from '../constants'
import type { Consumable } from '../lib/database.types'
import { formatYen, nextPurchaseDate, daysUntil, monthlyConsumableCost } from '../utils'

interface Props {
  consumable: Consumable
  householdMembers: number
  onClick: () => void
  border: boolean
  urgent?: boolean
}

export default function ConsumableRow({
  consumable: c,
  householdMembers,
  onClick,
  border,
  urgent,
}: Props) {
  const next = nextPurchaseDate(c, householdMembers)
  const days = daysUntil(next)
  const monthly = monthlyConsumableCost(c, householdMembers)
  const cat = CONSUMABLE_CATEGORIES.find((cat) => cat.name === c.category)

  const daysLabel =
    days < 0 ? `${Math.abs(days)}日超過` : days === 0 ? '今日' : days === 1 ? '明日' : `${days}日後`

  const daysColor =
    days < 0
      ? 'text-rose-500'
      : days <= 3
        ? 'text-rose-400'
        : days <= 7
          ? 'text-amber-500'
          : 'text-slate-400'

  return (
    <div
      className={`flex items-center px-4 py-3 gap-3 active:bg-slate-50 cursor-pointer ${border ? 'border-t border-slate-50' : ''} ${urgent ? 'bg-amber-50/40' : ''}`}
      onClick={onClick}
    >
      <span className="text-xl shrink-0">{cat?.icon ?? '📦'}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-700 truncate">{c.name}</div>
        <div className="text-xs text-slate-400">
          {formatYen(c.amount)}
          {c.quantity > 1 ? ` × ${c.quantity}個` : ''} / {c.cycle_days}日サイクル
          {c.members_scale ? ` (${householdMembers}人)` : ''}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className={`text-xs font-semibold ${daysColor}`}>
          {next.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })} ({daysLabel})
        </div>
        <div className="text-xs text-slate-400">{formatYen(monthly)}/月</div>
      </div>
      <span className="text-slate-300 text-sm">›</span>
    </div>
  )
}
