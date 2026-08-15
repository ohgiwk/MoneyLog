import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import ScreenHeader from './ui/ScreenHeader'
import BottomSheet from './ui/BottomSheet'
import FabButton from './ui/FabButton'
import Input from './ui/Input'
import FormLabel from './ui/FormLabel'
import ErrorText from './ui/ErrorText'
import ConfirmDialog from './ui/ConfirmDialog'
import { useStoreTypes, type StoreTypeItem } from '../hooks/useStoreTypes'

const ICON_SUGGESTIONS = [
  '🛒',
  '🏪',
  '💊',
  '🏬',
  '🔨',
  '⛽',
  '🍽️',
  '📦',
  '💴',
  '🖥️',
  '🥤',
  '🏷️',
  '🥩',
  '🍞',
  '🧴',
  '👔',
  '🎮',
  '🐾',
  '🌸',
  '🏥',
]

interface SortableItemProps {
  item: StoreTypeItem
  onEdit: (item: StoreTypeItem) => void
  onDelete: (item: StoreTypeItem) => void
}

function SortableItem({ item, onEdit, onDelete }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  return (
    <li
      ref={setNodeRef}
      style={style}
      className="bg-surface rounded-xl shadow-sm flex items-center gap-2 overflow-hidden"
    >
      <button
        {...attributes}
        {...listeners}
        className="px-3 py-4 text-ink-subtle touch-none cursor-grab active:cursor-grabbing border-r border-line-subtle self-stretch flex items-center"
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
      <span className="text-xl flex-shrink-0 w-8 text-center">{item.icon}</span>
      <span className="flex-1 text-sm text-ink font-medium min-w-0 truncate">{item.name}</span>
      <button
        onClick={() => onEdit(item)}
        className="w-8 h-8 flex items-center justify-center rounded-full text-ink-muted active:text-primary-500 rounded-lg"
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
        onClick={() => onDelete(item)}
        className="w-8 h-8 mr-1 flex items-center justify-center text-ink-subtle active:text-danger-400 rounded-lg"
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
          <path d="m19 6-.867 12.142A2 2 0 0 1 16.138 20H7.862a2 2 0 0 1-1.995-1.858L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
      </button>
    </li>
  )
}

interface FormState {
  icon: string
  name: string
}
const emptyForm = (): FormState => ({ icon: '', name: '' })

export default function StoreTypesScreen() {
  const navigate = useNavigate()
  const { items, addItem, updateItem, removeItem, reorder } = useStoreTypes()

  const [editing, setEditing] = useState<StoreTypeItem | 'new' | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<StoreTypeItem | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((it) => it.id === active.id)
    const newIndex = items.findIndex((it) => it.id === over.id)
    reorder(arrayMove(items, oldIndex, newIndex))
  }

  function openNew() {
    setForm(emptyForm())
    setFormError(null)
    setEditing('new')
  }

  function openEdit(item: StoreTypeItem) {
    setForm({ icon: item.icon, name: item.name })
    setFormError(null)
    setEditing(item)
  }

  function closeForm() {
    setEditing(null)
    setForm(emptyForm())
    setFormError(null)
  }

  function handleSave() {
    if (!form.name.trim()) {
      setFormError('店舗種別名を入力してください')
      return
    }
    if (editing === 'new') {
      addItem(form.name, form.icon || '🏷️')
    } else if (editing) {
      updateItem(editing.id, form.name, form.icon || '🏷️')
    }
    closeForm()
  }

  function handleDeleteConfirm() {
    if (deleteTarget) removeItem(deleteTarget.id)
    setDeleteTarget(null)
  }

  const sheetTitle = editing === 'new' ? '店舗種別を追加' : '店舗種別を編集'
  const footer = (
    <button
      type="button"
      onClick={handleSave}
      className="w-full py-3.5 text-base rounded-[2rem] shadow-lg bg-primary-500 active:bg-primary-600 text-white font-semibold"
    >
      保存する
    </button>
  )

  return (
    <div className="max-w-md mx-auto h-[100dvh] bg-surface-subtle flex flex-col overflow-hidden">
      <div className="sticky top-0 z-10 bg-surface border-b border-line-subtle">
        <ScreenHeader title="店舗種別" onBack={() => navigate(-1)} />
      </div>

      <div className="flex-1 p-4 pb-24 overflow-y-auto space-y-3">
        <p className="text-xs text-ink-muted">
          ドラッグで順番を変更できます。追加した店舗種別は出費入力・買い物メモに反映されます。
        </p>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((it) => it.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {items.map((item) => (
                <SortableItem
                  key={item.id}
                  item={item}
                  onEdit={openEdit}
                  onDelete={(it) => setDeleteTarget(it)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      </div>

      <div className="fixed bottom-8 left-0 right-0 max-w-md mx-auto flex justify-end pr-5 pointer-events-none z-20">
        <FabButton onClick={openNew} ariaLabel="店舗種別を追加" />
      </div>

      {deleteTarget && (
        <ConfirmDialog
          message={`「${deleteTarget.name}」を削除しますか？`}
          confirmLabel="削除する"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <BottomSheet isOpen={editing !== null} onClose={closeForm} title={sheetTitle} footer={footer}>
        <div className="space-y-4">
          <div>
            <FormLabel>アイコン（絵文字）</FormLabel>
            <Input
              type="text"
              value={form.icon}
              onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
              placeholder="例: 🛒"
              className="text-2xl text-center"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {ICON_SUGGESTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, icon: emoji }))}
                  className={
                    'w-10 h-10 rounded-xl text-xl flex items-center justify-center border ' +
                    (form.icon === emoji
                      ? 'border-primary-400 bg-primary-50 dark:bg-primary-950/60'
                      : 'border-line-subtle bg-surface-subtle active:bg-surface-hover')
                  }
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <FormLabel>店舗種別名</FormLabel>
            <Input
              type="text"
              value={form.name}
              onChange={(e) => {
                setForm((f) => ({ ...f, name: e.target.value }))
                if (formError) setFormError(null)
              }}
              placeholder="例: スーパー"
            />
            <ErrorText>{formError}</ErrorText>
          </div>
        </div>
      </BottomSheet>
    </div>
  )
}
