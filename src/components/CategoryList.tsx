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
  onToggle: (i: number) => void
}

function SortableItem({ id, category: c, index: i, onEdit, onToggle }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })

  const enabled = c.enabled !== false
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 px-4 transition-colors has-[:active]:bg-surface-subtle ${enabled ? 'bg-surface' : 'bg-surface-hover opacity-70'}`}
    >
      {/* ドラッグハンドル */}
      <button
        {...attributes}
        {...listeners}
        className="py-3 px-1 text-ink-subtle touch-none cursor-grab active:cursor-grabbing"
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

      <button
        onClick={() => onEdit(i)}
        className="flex items-center gap-3 flex-1 min-w-0 text-left self-stretch py-3"
        aria-label={`${c.name}を編集`}
      >
        <span
          className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0"
          style={{ backgroundColor: c.color + '22' }}
        >
          {c.icon}
        </span>
        <span className={`flex-1 text-sm ${enabled ? 'text-ink' : 'text-ink-muted'}`}>
          {c.name}
        </span>
      </button>

      {/* 有効/無効トグル */}
      <button
        onClick={() => onToggle(i)}
        className="py-3 px-1.5 rounded-lg"
        aria-label={enabled ? '無効にする' : '有効にする'}
      >
        <div
          className={`w-10 h-6 rounded-full relative transition-colors ${enabled ? 'bg-primary-500' : 'bg-line-strong'}`}
        >
          <div
            className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-1'}`}
          />
        </div>
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

  const enabledItems = categories.map((c, i) => ({ c, i })).filter(({ c }) => c.enabled !== false)
  const disabledItems = categories.map((c, i) => ({ c, i })).filter(({ c }) => c.enabled === false)

  const enabledIds = enabledItems.map(({ c }) => c.name)

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = enabledItems.findIndex(({ c }) => c.name === active.id)
    const newIdx = enabledItems.findIndex(({ c }) => c.name === over.id)
    if (oldIdx === -1 || newIdx === -1) return
    const newEnabled = arrayMove(enabledItems, oldIdx, newIdx).map(({ c }) => c)
    onChange([...newEnabled, ...disabledItems.map(({ c }) => c)])
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
    setDialog(null)
  }

  function toggle(i: number) {
    const next = [...categories]
    const nowEnabled = next[i].enabled === false
    next[i] = { ...next[i], enabled: nowEnabled }
    // 有効化→有効リストの末尾へ、無効化→無効リストの末尾へ並び替え
    const item = next.splice(i, 1)[0]
    if (nowEnabled) {
      const lastEnabledIdx = next.filter((c) => c.enabled !== false).length
      next.splice(lastEnabledIdx, 0, item)
    } else {
      next.push(item)
    }
    onChange(next)
  }

  const dialogInitial: CategoryInfo =
    dialog?.index !== null && dialog?.index !== undefined
      ? { ...categories[dialog.index] }
      : { name: '', icon: '📦', color: '#64748b' }

  return (
    <>
      <Card>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={enabledIds} strategy={verticalListSortingStrategy}>
            <ul className="divide-y divide-line-subtle">
              {enabledItems.map(({ c, i }) => (
                <SortableItem
                  key={c.name}
                  id={c.name}
                  category={c}
                  index={i}
                  onEdit={openEdit}
                  onToggle={toggle}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      </Card>

      {disabledItems.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-ink-muted px-1 mb-2">無効</p>
          <Card>
            <ul className="divide-y divide-line-subtle">
              {disabledItems.map(({ c, i }) => (
                <SortableItem
                  key={c.name}
                  id={c.name}
                  category={c}
                  index={i}
                  onEdit={openEdit}
                  onToggle={toggle}
                />
              ))}
            </ul>
          </Card>
        </div>
      )}

      <CategoryFormDialog
        isOpen={dialog !== null}
        initial={dialogInitial}
        onSave={handleSave}
        onClose={() => setDialog(null)}
        onDelete={
          dialog?.index !== null && dialog?.index !== undefined
            ? () => remove(dialog.index!)
            : undefined
        }
      />
    </>
  )
})

export default CategoryList
