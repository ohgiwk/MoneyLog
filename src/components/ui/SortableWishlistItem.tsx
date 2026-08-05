import type { WishlistItem } from '../../lib/services/wishlistService'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Props {
  item: WishlistItem
  onEdit: (item: WishlistItem) => void
  detail?: string
  showChevron?: boolean
}

export default function SortableWishlistItem({ item, onEdit, detail, showChevron }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  return (
    <li ref={setNodeRef} style={style} className="bg-surface rounded-xl shadow-sm flex items-center gap-2 overflow-hidden">
      <button
        {...attributes}
        {...listeners}
        className="px-3 py-4 text-ink-subtle touch-none cursor-grab active:cursor-grabbing border-r border-line-subtle self-stretch flex items-center"
        aria-label="並び替え"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="8" x2="20" y2="8"/>
          <line x1="4" y1="16" x2="20" y2="16"/>
        </svg>
      </button>
      <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
        item.priority === 1 ? 'bg-warning-400 text-white'
        : item.priority === 2 ? 'bg-surface-muted text-white'
        : item.priority === 3 ? 'bg-orange-300 text-white'
        : 'bg-surface-muted text-ink-muted'
      }`}>
        {item.priority}
      </span>
      <button
        onClick={() => onEdit(item)}
        className="flex-1 min-w-0 flex items-center gap-2 py-3.5 pr-3 text-left active:bg-surface-subtle"
      >
        <div className="flex-1 min-w-0">
          <p className="text-ink-strong font-medium text-sm truncate">{item.name}</p>
          {detail && <p className="text-ink-muted text-xs truncate">{detail}</p>}
        </div>
        <span className="text-ink font-semibold text-sm flex-shrink-0">¥{item.target_amount.toLocaleString()}</span>
        {showChevron && <span className="text-ink-subtle text-lg flex-shrink-0">›</span>}
      </button>
    </li>
  )
}
