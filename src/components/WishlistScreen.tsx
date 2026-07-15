import { useState } from 'react'
import { useWishlistQuery, useWishlistInsert, useWishlistUpdate, useWishlistDelete } from '../hooks/queries/useWishlistQuery'
import type { WishlistItem } from '../lib/services/wishlistService'
import ConfirmDialog from './ui/ConfirmDialog'
import ScreenHeader from './ui/ScreenHeader'
import Modal from './ui/Modal'
import Button from './ui/Button'
import Input from './ui/Input'
import FormLabel from './ui/FormLabel'
import ErrorText from './ui/ErrorText'

interface Props {
  userId: string
  onBack: () => void
}

interface FormState {
  name: string
  price: string
}

const emptyForm = (): FormState => ({ name: '', price: '' })

export default function WishlistScreen({ userId, onBack }: Props) {
  const [editing, setEditing] = useState<WishlistItem | 'new' | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [moving, setMoving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

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

  const openNew = () => {
    setForm(emptyForm())
    setEditing('new')
    setError(null)
  }

  const openEdit = (item: WishlistItem) => {
    setForm({ name: item.name, price: String(item.target_amount) })
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
        const nextPriority = items.length > 0 ? items[items.length - 1].priority + 1 : 1
        await insertMutation.mutateAsync({
          user_id: userId,
          name: form.name.trim(),
          target_amount: Number(form.price),
          priority: nextPriority,
          purchased_at: null,
          notes: null,
        })
      } else if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          data: { name: form.name.trim(), target_amount: Number(form.price) },
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

  const moveItem = async (index: number, direction: 'up' | 'down') => {
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= items.length) return
    setMoving(items[index].id)
    try {
      const reordered = [...items]
      ;[reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]]
      await renormalize(reordered)
    } catch {
      setError('並び替えに失敗しました')
    } finally {
      setMoving(null)
    }
  }

  return (
    <div className="max-w-md mx-auto h-[100dvh] bg-surface-subtle flex flex-col overflow-hidden">
      <div className="sticky top-0 z-10 bg-surface border-b border-line-subtle">
        <ScreenHeader title="🎯 目標・欲しいもの" onBack={onBack} />
      </div>

      <div className="flex-1 px-4 py-4 pb-24 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-12 text-ink-muted text-sm">読み込み中...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-ink-muted">
            <div className="text-4xl mb-3">🎁</div>
            <p className="text-sm">目標がまだありません</p>
            <p className="text-sm mt-1">下の＋ボタンから追加できます</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((item, index) => (
              <li key={item.id} className="bg-surface rounded-xl shadow-sm flex items-center gap-2 overflow-hidden">
                <div className="flex flex-col border-r border-line-subtle py-1">
                  <button
                    onClick={() => moveItem(index, 'up')}
                    disabled={index === 0 || moving !== null}
                    className="px-2 py-1.5 text-ink-muted disabled:text-ink-subtle active:text-ink text-base leading-none"
                    aria-label="上に移動"
                  >▲</button>
                  <button
                    onClick={() => moveItem(index, 'down')}
                    disabled={index === items.length - 1 || moving !== null}
                    className="px-2 py-1.5 text-ink-muted disabled:text-ink-subtle active:text-ink text-base leading-none"
                    aria-label="下に移動"
                  >▼</button>
                </div>
                <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  item.priority === 1 ? 'bg-warning-400 text-white'
                  : item.priority === 2 ? 'bg-surface-muted text-white'
                  : item.priority === 3 ? 'bg-orange-300 text-white'
                  : 'bg-surface-muted text-ink-muted'
                }`}>
                  {item.priority}
                </span>
                <button
                  onClick={() => openEdit(item)}
                  className="flex-1 min-w-0 flex items-center gap-2 py-3.5 pr-3 text-left active:bg-surface-subtle"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-ink-strong font-medium text-sm truncate">{item.name}</p>
                    {item.notes && <p className="text-ink-muted text-xs truncate">{item.notes}</p>}
                  </div>
                  <span className="text-ink font-semibold text-sm flex-shrink-0">¥{item.target_amount.toLocaleString()}</span>
                  <span className="text-ink-subtle text-lg flex-shrink-0">›</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editing === null && (
        <div className="fixed bottom-6 left-0 right-0 max-w-md mx-auto px-6 flex justify-end pointer-events-none z-10">
          <button
            onClick={openNew}
            className="w-14 h-14 rounded-full bg-primary-500 text-white shadow-lg text-2xl flex items-center justify-center active:bg-primary-600 pointer-events-auto"
            aria-label="目標を追加"
          >＋</button>
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
            </div>
            <div className="mt-5 space-y-2">
              <Button fullWidth onClick={handleSave} disabled={saving}>
                {saving ? '保存中...' : '保存する'}
              </Button>
              {editing !== 'new' && (
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={() => setConfirmDelete(true)}
                  disabled={saving}
                  className="text-danger-500 active:bg-danger-50 py-2.5"
                >
                  削除する
                </Button>
              )}
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
