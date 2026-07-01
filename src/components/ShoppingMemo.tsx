import { useEffect, useState } from 'react'
import type { CategoryInfo } from '../constants'
import type { ShoppingItem } from '../lib/database.types'
import { shoppingMemoService } from '../lib/services/shoppingMemoService'
import { transactionService } from '../lib/services/transactionService'
import PurchaseDialog from './PurchaseDialog'

interface Props {
  userId: string
  expenseCategories: CategoryInfo[]
}

export default function ShoppingMemo({ userId, expenseCategories }: Props) {
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [showDialog, setShowDialog] = useState(false)

  useEffect(() => {
    void load()
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await shoppingMemoService.fetchItems(userId)
      setItems(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'データの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd() {
    const name = newName.trim()
    if (!name) return
    setAdding(true)
    try {
      const item = await shoppingMemoService.addItem(userId, name)
      setItems(prev => [...prev, item])
      setNewName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '追加に失敗しました')
    } finally {
      setAdding(false)
    }
  }

  async function handleUpdate(id: string) {
    const name = editingName.trim()
    if (!name) return
    try {
      await shoppingMemoService.updateItem(id, name)
      setItems(prev => prev.map(it => it.id === id ? { ...it, name } : it))
      setEditingId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新に失敗しました')
    }
  }

  async function handleDelete(id: string) {
    try {
      await shoppingMemoService.deleteItem(id)
      setItems(prev => prev.filter(it => it.id !== id))
      setSelected(prev => { const n = new Set(prev); n.delete(id); return n })
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました')
    }
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  async function handlePurchase(category: string, amount: number, memo: string, date: string) {
    await transactionService.insert({
      user_id: userId,
      type: 'expense',
      expense_kind: 'one_time',
      date,
      category,
      amount,
      memo: memo || null,
      recurring_rule_id: null,
    })
    const ids = [...selected]
    await shoppingMemoService.deleteItems(ids)
    setItems(prev => prev.filter(it => !selected.has(it.id)))
    setSelected(new Set())
    setShowDialog(false)
  }

  const selectedItems = items.filter(it => selected.has(it.id))

  return (
    <div className="p-4 space-y-4">
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-600">
          {error}
        </div>
      )}

      {/* 追加フォーム */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') void handleAdd() }}
          placeholder="商品名を入力..."
          className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-emerald-400 bg-white"
        />
        <button
          onClick={handleAdd}
          disabled={adding || !newName.trim()}
          className="px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-medium active:bg-emerald-600 disabled:opacity-40"
        >
          追加
        </button>
      </div>

      {/* リスト */}
      {loading ? (
        <div className="text-center py-8 text-slate-400 text-sm">読み込み中...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-10 text-slate-400 text-sm">
          <p className="text-3xl mb-2">🛒</p>
          <p>買い物メモがありません</p>
          <p className="text-xs mt-1">商品名を入力して追加してください</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-slate-100 px-3 py-3 flex items-center gap-3 shadow-sm"
            >
              {/* チェックボックス */}
              <button
                onClick={() => toggleSelect(item.id)}
                className={
                  'w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-colors ' +
                  (selected.has(item.id)
                    ? 'bg-emerald-500 border-emerald-500'
                    : 'border-slate-300 bg-white')
                }
              >
                {selected.has(item.id) && (
                  <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                    <path d="M1 4L4 7.5L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>

              {/* 名前 / 編集 */}
              {editingId === item.id ? (
                <input
                  autoFocus
                  type="text"
                  value={editingName}
                  onChange={e => setEditingName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') void handleUpdate(item.id)
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  onBlur={() => void handleUpdate(item.id)}
                  className="flex-1 text-sm text-slate-800 border-b border-emerald-400 outline-none bg-transparent"
                />
              ) : (
                <span
                  className="flex-1 text-sm text-slate-800"
                  onDoubleClick={() => { setEditingId(item.id); setEditingName(item.name) }}
                >
                  {item.name}
                </span>
              )}

              {/* 編集・削除ボタン */}
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    if (editingId === item.id) { setEditingId(null) }
                    else { setEditingId(item.id); setEditingName(item.name) }
                  }}
                  className="p-1.5 text-slate-400 active:text-emerald-500 rounded-lg"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button
                  onClick={() => void handleDelete(item.id)}
                  className="p-1.5 text-slate-400 active:text-rose-500 rounded-lg"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 購入済みボタン（選択時に表示） */}
      {selected.size > 0 && (
        <div className="fixed bottom-24 left-0 right-0 max-w-md mx-auto px-4 z-20">
          <button
            onClick={() => setShowDialog(true)}
            className="w-full py-3.5 rounded-2xl bg-emerald-500 text-white font-medium text-sm shadow-lg active:bg-emerald-600"
          >
            {selected.size}件を購入済みとして記録
          </button>
        </div>
      )}

      {/* 購入記録ダイアログ */}
      {showDialog && (
        <PurchaseDialog
          itemNames={selectedItems.map(it => it.name)}
          expenseCategories={expenseCategories}
          onConfirm={handlePurchase}
          onCancel={() => setShowDialog(false)}
        />
      )}
    </div>
  )
}
