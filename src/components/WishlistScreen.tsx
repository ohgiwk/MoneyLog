import { useEffect, useState } from 'react'
import { wishlistService, type WishlistItem } from '../lib/services/wishlistService'
import ConfirmDialog from './ui/ConfirmDialog'

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
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<WishlistItem | 'new' | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [moving, setMoving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = await wishlistService.fetchByUser(userId)
      setItems(data)
    } catch {
      setError('データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // 優先順位を 1..N に正規化して一括保存
  const renormalize = async (ordered: WishlistItem[]) => {
    await Promise.all(
      ordered.map((item, i) =>
        wishlistService.update(item.id, { priority: i + 1 })
      )
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
    setSaving(true)
    setError(null)
    try {
      if (editing === 'new') {
        // 最下位に追加
        const nextPriority = items.length > 0 ? items[items.length - 1].priority + 1 : 1
        await wishlistService.insert({
          user_id: userId,
          name: form.name.trim(),
          target_amount: Number(form.price),
          priority: nextPriority,
          purchased_at: null,
          notes: null,
        })
      } else if (editing) {
        await wishlistService.update(editing.id, {
          name: form.name.trim(),
          target_amount: Number(form.price),
        })
      }
      await load()
      closeForm()
    } catch {
      setError('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (editing === 'new' || !editing) return
    setSaving(true)
    setConfirmDelete(false)
    try {
      await wishlistService.delete(editing.id)
      const remaining = items.filter(i => i.id !== editing.id)
      await renormalize(remaining)
      await load()
      closeForm()
    } catch {
      setError('削除に失敗しました')
    } finally {
      setSaving(false)
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
      await load()
    } catch {
      setError('並び替えに失敗しました')
    } finally {
      setMoving(null)
    }
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col">
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-100">
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-slate-500 active:text-slate-700 p-1 -ml-1 text-2xl leading-none"
            aria-label="戻る"
          >
            ‹
          </button>
          <span className="font-semibold text-slate-800 text-lg">🎯 目標・欲しいもの</span>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 px-4 py-4 pb-24">
        {loading ? (
          <div className="flex justify-center py-12 text-slate-400 text-sm">読み込み中...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <div className="text-4xl mb-3">🎁</div>
            <p className="text-sm">目標がまだありません</p>
            <p className="text-sm mt-1">下の＋ボタンから追加できます</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((item, index) => (
              <li
                key={item.id}
                className="bg-white rounded-xl shadow-sm flex items-center gap-2 overflow-hidden"
              >
                {/* 並び替えボタン */}
                <div className="flex flex-col border-r border-slate-100 py-1">
                  <button
                    onClick={() => moveItem(index, 'up')}
                    disabled={index === 0 || moving !== null}
                    className="px-2 py-1.5 text-slate-400 disabled:text-slate-200 active:text-slate-600 text-base leading-none"
                    aria-label="上に移動"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moveItem(index, 'down')}
                    disabled={index === items.length - 1 || moving !== null}
                    className="px-2 py-1.5 text-slate-400 disabled:text-slate-200 active:text-slate-600 text-base leading-none"
                    aria-label="下に移動"
                  >
                    ▼
                  </button>
                </div>

                {/* 優先順位バッジ */}
                <span
                  className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    item.priority === 1
                      ? 'bg-amber-400 text-white'
                      : item.priority === 2
                      ? 'bg-slate-300 text-white'
                      : item.priority === 3
                      ? 'bg-orange-300 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {item.priority}
                </span>

                {/* コンテンツ（タップで編集） */}
                <button
                  onClick={() => openEdit(item)}
                  className="flex-1 min-w-0 flex items-center gap-2 py-3.5 pr-3 text-left active:bg-slate-50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-800 font-medium text-sm truncate">{item.name}</p>
                    {item.notes && (
                      <p className="text-slate-400 text-xs truncate">{item.notes}</p>
                    )}
                  </div>
                  <span className="text-slate-700 font-semibold text-sm flex-shrink-0">
                    ¥{item.target_amount.toLocaleString()}
                  </span>
                  <span className="text-slate-300 text-lg flex-shrink-0">›</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* FAB */}
      {editing === null && (
        <div className="fixed bottom-6 left-0 right-0 max-w-md mx-auto px-6 flex justify-end pointer-events-none z-10">
          <button
            onClick={openNew}
            className="w-14 h-14 rounded-full bg-emerald-500 text-white shadow-lg text-2xl flex items-center justify-center active:bg-emerald-600 pointer-events-auto"
            aria-label="目標を追加"
          >
            ＋
          </button>
        </div>
      )}

      {/* 編集フォームオーバーレイ（中央表示） */}
      {editing !== null && (
        <>
          <div className="fixed inset-0 bg-black/40 z-20 flex items-center justify-center px-4" onClick={closeForm}>
            <div
              className="w-full max-w-sm bg-white rounded-2xl shadow-2xl px-5 pt-5 pb-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-800 text-base">
                  {editing === 'new' ? '目標を追加' : '目標を編集'}
                </h2>
                <button onClick={closeForm} className="text-slate-400 active:text-slate-600 text-xl px-1">✕</button>
              </div>

              {error && <p className="text-rose-500 text-xs mb-3">{error}</p>}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">商品名</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="例：新しいスニーカー"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">金額（円）</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    placeholder="例：12000"
                    inputMode="numeric"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              </div>

              <div className="mt-5 space-y-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-emerald-500 active:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
                >
                  {saving ? '保存中...' : '保存する'}
                </button>
                {editing !== 'new' && (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    disabled={saving}
                    className="w-full text-rose-500 active:bg-rose-50 py-2.5 rounded-xl text-sm"
                  >
                    削除する
                  </button>
                )}
              </div>
            </div>
          </div>

          {confirmDelete && editing !== 'new' && (
            <ConfirmDialog
              message={`「${editing.name}」を削除しますか？`}
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
