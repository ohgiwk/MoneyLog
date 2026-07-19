import { useState } from 'react'
import FabButton from './ui/FabButton'
import { useQueryClient } from '@tanstack/react-query'
import { useWishlistQuery, useWishlistInsert, useWishlistUpdate, useWishlistDelete } from '../hooks/queries/useWishlistQuery'
import type { WishlistItem } from '../lib/services/wishlistService'
import ConfirmDialog from './ui/ConfirmDialog'
import Modal from './ui/Modal'
import Button from './ui/Button'
import Input from './ui/Input'
import FormLabel from './ui/FormLabel'
import ErrorText from './ui/ErrorText'
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

function SortableWishlistItem({ item, onEdit }: { item: WishlistItem; onEdit: (item: WishlistItem) => void }) {
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
        className="px-3 self-stretch flex items-center text-ink-subtle touch-none cursor-grab active:cursor-grabbing border-r border-line-subtle"
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
          {item.target_date && (
            <p className="text-ink-muted text-xs truncate">
              {item.target_date.slice(0, 7).replace('-', '年').replace('-', '月')}頃
            </p>
          )}
          {!item.target_date && item.notes && <p className="text-ink-muted text-xs truncate">{item.notes}</p>}
        </div>
        <span className="text-ink font-semibold text-sm flex-shrink-0">¥{item.target_amount.toLocaleString()}</span>
      </button>
    </li>
  )
}

interface Props {
  userId: string
}

interface FormState {
  name: string
  price: string
  targetYear: string
  targetMonth: string
}

const emptyForm = (): FormState => ({ name: '', price: '', targetYear: '', targetMonth: '' })

export default function WishlistPanel({ userId }: Props) {
  const [editing, setEditing] = useState<WishlistItem | 'new' | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const queryClient = useQueryClient()
  const { data: items = [], isLoading: loading } = useWishlistQuery(userId)
  const insertMutation = useWishlistInsert(userId)
  const updateMutation = useWishlistUpdate(userId)
  const deleteMutation = useWishlistDelete(userId)

  const saving = insertMutation.isPending || updateMutation.isPending || deleteMutation.isPending

  const renormalize = async (ordered: WishlistItem[]) => {
    await Promise.all(
      ordered.map((item, i) => updateMutation.mutateAsync({ id: item.id, data: { priority: i + 1 } }))
    )
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex(i => i.id === active.id)
    const newIndex = items.findIndex(i => i.id === over.id)
    const reordered = arrayMove(items, oldIndex, newIndex)
    // 楽観的更新: サーバー応答を待たずに即座にUIへ反映
    queryClient.setQueryData(['wishlist', userId], reordered)
    try {
      await renormalize(reordered)
    } catch {
      // 失敗時は元のデータに戻す
      queryClient.setQueryData(['wishlist', userId], items)
      setError('並び替えに失敗しました')
    }
  }

  const openNew = () => {
    setForm(emptyForm())
    setEditing('new')
    setError(null)
  }

  const openEdit = (item: WishlistItem) => {
    let targetYear = ''
    let targetMonth = ''
    if (item.target_date) {
      const [y, m] = item.target_date.split('-')
      targetYear = y
      targetMonth = String(Number(m))
    }
    setForm({ name: item.name, price: String(item.target_amount), targetYear, targetMonth })
    setEditing(item)
    setError(null)
  }

  const closeForm = () => {
    setEditing(null)
    setForm(emptyForm())
    setError(null)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setError('商品名を入力してください'); return }
    if (!form.price) { setError('金額を入力してください'); return }
    setError(null)
    try {
      if (editing === 'new') {
        const targetDate = form.targetYear && form.targetMonth
        ? `${form.targetYear}-${String(form.targetMonth).padStart(2, '0')}-01`
        : null
        const nextPriority = items.length > 0 ? items[items.length - 1].priority + 1 : 1
        await insertMutation.mutateAsync({
          user_id: userId,
          name: form.name.trim(),
          target_amount: Number(form.price),
          priority: nextPriority,
          purchased_at: null,
          target_date: targetDate,
          notes: null,
        })
      } else if (editing) {
        const targetDate = form.targetYear && form.targetMonth
          ? `${form.targetYear}-${String(form.targetMonth).padStart(2, '0')}-01`
          : null
        await updateMutation.mutateAsync({
          id: editing.id,
          data: { name: form.name.trim(), target_amount: Number(form.price), target_date: targetDate },
        })
      }
      closeForm()
    } catch {
      setError('保存に失敗しました')
    }
  }

  const handleDelete = async () => {
    if (editing === 'new' || !editing) return
    setConfirmDelete(false)
    try {
      await deleteMutation.mutateAsync(editing.id)
      const remaining = items.filter(i => i.id !== (editing as WishlistItem).id)
      await renormalize(remaining)
      closeForm()
    } catch {
      setError('削除に失敗しました')
    }
  }

  return (
    <div className="relative">
      <div className="px-4 py-4 pb-24">
        {loading ? (
          <div className="flex justify-center py-12 text-ink-muted text-sm">読み込み中...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-ink-muted">
            <div className="text-4xl mb-3">🎁</div>
            <p className="text-sm">目標がまだありません</p>
            <p className="text-sm mt-1">下の＋ボタンから追加できます</p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-3">
                {items.map((item) => (
                  <SortableWishlistItem key={item.id} item={item} onEdit={openEdit} />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {editing === null && (
        <div className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] left-0 right-0 max-w-md mx-auto flex justify-end pr-5 pointer-events-none z-10">
          <FabButton onClick={openNew} ariaLabel="目標を追加" />
        </div>
      )}

      {editing !== null && (
        <>
          <Modal isOpen onClose={closeForm} position="center" className="w-full max-w-sm mx-4 px-5 pt-5 pb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-ink-strong text-base">
                {editing === 'new' ? '目標を追加' : '目標を編集'}
              </h2>
              <button onClick={closeForm} className="text-ink-muted active:text-ink text-xl px-1">✕</button>
            </div>
            <ErrorText className="mb-3">{error}</ErrorText>
            <div className="space-y-3">
              <div>
                <FormLabel className="font-medium">商品名</FormLabel>
                <Input
                  variant="dialog"
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="例：新しいスニーカー"
                />
              </div>
              <div>
                <FormLabel className="font-medium">金額（円）</FormLabel>
                <Input
                  variant="dialog"
                  type="number"
                  value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                  placeholder="例：12000"
                  inputMode="numeric"
                />
              </div>
              <div>
                <FormLabel className="font-medium">目標購入時期（任意）</FormLabel>
                <div className="flex gap-2">
                  <select
                    value={form.targetYear}
                    onChange={e => setForm(f => ({ ...f, targetYear: e.target.value }))}
                    className="flex-1 bg-surface-muted text-ink rounded-lg px-3 py-2.5 text-sm border border-line-subtle focus:outline-none focus:ring-2 focus:ring-primary-400"
                  >
                    <option value="">年</option>
                    {Array.from({ length: 16 }, (_, i) => new Date().getFullYear() + i).map(y => (
                      <option key={y} value={String(y)}>{y}年</option>
                    ))}
                  </select>
                  <select
                    value={form.targetMonth}
                    onChange={e => setForm(f => ({ ...f, targetMonth: e.target.value }))}
                    className="flex-1 bg-surface-muted text-ink rounded-lg px-3 py-2.5 text-sm border border-line-subtle focus:outline-none focus:ring-2 focus:ring-primary-400"
                  >
                    <option value="">月</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <option key={m} value={String(m)}>{m}月</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="mt-5 flex items-center gap-2">
              {editing !== 'new' && (
                <button
                  onClick={() => setConfirmDelete(true)}
                  disabled={saving}
                  className="bg-danger-500 text-white w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 active:bg-danger-600 disabled:opacity-40"
                  aria-label="削除"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6"/>
                    <path d="M14 11v6"/>
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                </button>
              )}
              <Button fullWidth onClick={handleSave} disabled={saving}>
                {saving ? '保存中...' : '保存する'}
              </Button>
            </div>
          </Modal>
          {confirmDelete && editing !== 'new' && (
            <ConfirmDialog
              message={`「${(editing as WishlistItem).name}」を削除しますか？`}
              confirmLabel="削除"
              onConfirm={handleDelete}
              onCancel={() => setConfirmDelete(false)}
            />
          )}
        </>
      )}
    </div>
  )
}
