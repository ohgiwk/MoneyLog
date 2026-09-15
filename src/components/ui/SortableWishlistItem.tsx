import type { WishlistItem } from '../../lib/services/wishlistService'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const STEP = 1000

interface Props {
  item: WishlistItem
  onEdit: (item: WishlistItem) => void
  detail?: string
  showChevron?: boolean
  allocation?: { amount: number; pct: number }
  allocated?: number
  remaining?: number
  monthlyTarget?: number
  onIncrease?: () => void
  onDecrease?: () => void
  onMarkAchieved?: () => void
}

export default function SortableWishlistItem({
  item,
  onEdit,
  detail,
  showChevron,
  allocation,
  allocated,
  remaining,
  monthlyTarget,
  onIncrease,
  onDecrease,
  onMarkAchieved,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const hasControl = onIncrease !== undefined
  const pct =
    item.target_amount > 0 && allocated !== undefined
      ? Math.min((allocated / item.target_amount) * 100, 100)
      : 0
  const isAchievable = allocated !== undefined && allocated >= item.target_amount
  const remainingAmount = Math.max(0, item.target_amount - (allocated ?? 0))
  const monthsToGoal =
    !isAchievable && monthlyTarget && monthlyTarget > 0
      ? Math.ceil(remainingAmount / monthlyTarget)
      : null

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="bg-surface rounded-xl shadow-sm overflow-hidden flex"
    >
      <button
        {...attributes}
        {...listeners}
        className="px-3 text-ink-subtle touch-none cursor-grab active:cursor-grabbing border-r border-line-subtle flex-shrink-0 flex items-center self-stretch"
        aria-label="並び替え"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="4" y1="8" x2="20" y2="8" />
          <line x1="4" y1="16" x2="20" y2="16" />
        </svg>
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ml-2 ${
              item.priority === 1
                ? 'bg-warning-400 text-white'
                : item.priority === 2
                  ? 'bg-surface-muted text-white'
                  : item.priority === 3
                    ? 'bg-orange-300 text-white'
                    : 'bg-surface-muted text-ink-muted'
            }`}
          >
            {item.priority}
          </span>
          <button
            onClick={() => onEdit(item)}
            className="flex-1 min-w-0 flex items-center gap-2 py-3.5 pr-3 text-left active:bg-surface-subtle"
          >
            <div className="flex-1 min-w-0">
              <p className="text-ink-strong font-medium text-sm truncate">{item.name}</p>
              {detail && <p className="text-ink-muted text-xs truncate">{detail}</p>}
              {!hasControl && allocation && allocation.amount > 0 && (
                <div className="mt-1.5 space-y-0.5">
                  <div className="h-1.5 bg-surface-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${allocation.pct >= 100 ? 'bg-income-500' : 'bg-primary-400'}`}
                      style={{ width: `${Math.min(allocation.pct, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-ink-muted">
                    ¥{allocation.amount.toLocaleString()} 配分済み ({Math.round(allocation.pct)}%)
                  </p>
                </div>
              )}
            </div>
            {hasControl ? (
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-ink-muted leading-none mb-0.5">目標額</p>
                <p className="text-ink font-semibold text-sm leading-none">
                  ¥{item.target_amount.toLocaleString()}
                </p>
              </div>
            ) : (
              <span className="text-ink font-semibold text-sm flex-shrink-0">
                ¥{item.target_amount.toLocaleString()}
              </span>
            )}
            {showChevron && <span className="text-ink-subtle text-lg flex-shrink-0">›</span>}
          </button>
        </div>

        {hasControl && (
          <div className="pb-3 pr-3 pl-2 space-y-2">
            <div className="h-1.5 bg-surface-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${isAchievable ? 'bg-income-500' : 'bg-primary-400'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onDecrease}
                disabled={(allocated ?? 0) <= 0}
                className="w-9 h-9 rounded-full bg-surface-muted flex items-center justify-center text-ink text-xl leading-none active:bg-line-subtle disabled:opacity-30 flex-shrink-0"
                aria-label="1,000円減らす"
              >
                −
              </button>
              <div className="flex-1 text-center">
                <span
                  className={`text-sm font-semibold ${isAchievable ? 'text-income-600' : 'text-ink'}`}
                >
                  ¥{(allocated ?? 0).toLocaleString()}
                </span>
                {isAchievable && <span className="text-xs text-ink-muted ml-1.5">達成 ✓</span>}
              </div>
              <button
                onClick={onIncrease}
                disabled={(remaining ?? 0) < STEP}
                className="w-9 h-9 rounded-full bg-surface-muted flex items-center justify-center text-ink text-xl leading-none active:bg-line-subtle disabled:opacity-30 flex-shrink-0"
                aria-label="1,000円増やす"
              >
                +
              </button>
            </div>
            {(monthlyTarget ?? 0) > 0 && (
              <div className="flex justify-between text-xs text-ink-muted pt-0.5">
                <span>月 ¥{(monthlyTarget ?? 0).toLocaleString()}</span>
                {isAchievable ? (
                  <span className="text-income-600 font-medium">達成可能 ✓</span>
                ) : monthsToGoal !== null ? (
                  <span>達成まで約 {monthsToGoal} ヶ月</span>
                ) : null}
              </div>
            )}
            {onMarkAchieved && (
              <button
                onClick={onMarkAchieved}
                className="w-full py-2 text-xs font-semibold text-white bg-income-600 active:bg-income-700 rounded-xl"
              >
                購入済みにする
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  )
}
