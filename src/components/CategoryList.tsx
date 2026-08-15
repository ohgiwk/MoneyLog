import Card from './ui/Card'
import { useState, useImperativeHandle, forwardRef } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { CategoryInfo } from '../constants'
import CategoryFormDialog from './CategoryFormDialog'

interface Props {
  categories: CategoryInfo[]
  onChange: (cats: CategoryInfo[]) => void
}

export interface CategoryListHandle {
  openAdd: () => void
}

interface SortableItemProps {
  id: string
  category: CategoryInfo
  index: number
  onEdit: (i: number) => void
  onRemove: (i: number) => void
}

function SortableItem({ id, category: c, index: i, onEdit, onRemove }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <li ref={setNodeRef} style={style} className="flex items-center gap-3 px-4 py-3 bg-surface">
      {/* ドラッグハンドル */}
      <button
        {...attributes}
        {...listeners}
        className="p-1 text-ink-subtle touch-none cursor-grab active:cursor-grabbing"
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

      <span
        className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0"
        style={{ backgroundColor: c.color + '22' }}
      >
        {c.icon}
      </span>
      <span className="flex-1 text-sm text-ink">{c.name}</span>
      <button
        onClick={() => onEdit(i)}
        className="p-1.5 text-ink-muted active:text-primary-500 rounded-lg"
        aria-label="編集"
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
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>
      <button
        onClick={() => onRemove(i)}
        className="p-1.5 text-ink-subtle active:text-danger-400 rounded-lg"
        aria-label="削除"
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
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
      </button>
    </li>
  )
}

const CategoryList = forwardRef<CategoryListHandle, Props>(function CategoryList(
  { categories, onChange },
  ref
) {
  const [dialog, setDialog] = useState<{ index: number | null } | null>(null)

  useImperativeHandle(ref, () => ({ openAdd: () => setDialog({ index: null }) }))

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  // カテゴリ名をIDとして使用（ユニーク前提）
  const ids = categories.map((c) => c.name)

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = ids.indexOf(active.id as string)
    const newIndex = ids.indexOf(over.id as string)
    onChange(arrayMove(categories, oldIndex, newIndex))
  }

  function openEdit(i: number) {
    setDialog({ index: i })
  }

  function handleSave(cat: CategoryInfo) {
    if (dialog === null) return
    const next = [...categories]
    if (dialog.index !== null) {
      next[dialog.index] = cat
    } else {
      next.push(cat)
    }
    onChange(next)
    setDialog(null)
  }

  function remove(i: number) {
    onChange(categories.filter((_, idx) => idx !== i))
  }

  const dialogInitial: CategoryInfo =
    dialog?.index !== null && dialog?.index !== undefined
      ? { ...categories[dialog.index] }
      : { name: '', icon: '📦', color: '#64748b' }

  return (
    <>
      <Card>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <ul className="divide-y divide-line-subtle">
              {categories.map((c, i) => (
                <SortableItem
                  key={c.name}
                  id={c.name}
                  category={c}
                  index={i}
                  onEdit={openEdit}
                  onRemove={remove}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      </Card>

      <CategoryFormDialog
        isOpen={dialog !== null}
        initial={dialogInitial}
        onSave={handleSave}
        onClose={() => setDialog(null)}
      />
    </>
  )
})

export default CategoryList
