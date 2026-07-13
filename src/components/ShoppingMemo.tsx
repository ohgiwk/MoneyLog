import { useEffect, useState } from 'react'
import type { CategoryInfo } from '../constants'
import type { ShoppingItem } from '../lib/database.types'
import { shoppingMemoService } from '../lib/services/shoppingMemoService'
import { transactionService } from '../lib/services/transactionService'
import PurchaseDialog from './PurchaseDialog'
import ShoppingItemDialog from './ShoppingItemDialog'

interface Props {
  userId: string
  expenseCategories: CategoryInfo[]
  onTransactionAdded?: () => void
}

export default function ShoppingMemo({ userId, expenseCategories, onTransactionAdded }: Props) {
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showDialog, setShowDialog] = useState(false)
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null)
  const [showItemDialog, setShowItemDialog] = useState(false)

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

  useEffect(() => {
    void load() // eslint-disable-line react-hooks/set-state-in-effect -- マウント時の非同期データ取得
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  function openAddDialog() {
    setEditingItem(null)
    setShowItemDialog(true)
  }

  function openEditDialog(item: ShoppingItem) {
    setEditingItem(item)
    setShowItemDialog(true)
  }

  async function handleSaveItem(name: string, memo: string | null, budgetAmount: number) {
    if (editingItem) {
      await shoppingMemoService.updateItem(editingItem.id, name, memo, budgetAmount)
      setItems(prev => prev.map(it => it.id === editingItem.id ? { ...it, name, memo, budget_amount: budgetAmount } : it))
    } else {
      const item = await shoppingMemoService.addItem(userId, name, memo, budgetAmount)
      setItems(prev => [...prev, item])
    }
    setShowItemDialog(false)
    setEditingItem(null)
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
      store_type: null,
      meal_type: null,
      payment_type: null,
      payment_method: null,
      recurring_rule_id: null,
    })
    const ids = [...selected]
    await shoppingMemoService.deleteItems(ids)
    setItems(prev => prev.filter(it => !selected.has(it.id)))
    setSelected(new Set())
    setShowDialog(false)
    onTransactionAdded?.()
  }

  const selectedItems = items.filter(it => selected.has(it.id))

  return (
    <div className="p-4 pb-24 space-y-4">
      {error && (
        <div className="bg-danger-50 border border-danger-200 rounded-xl px-4 py-3 text-sm text-danger-600">
          {error}
        </div>
      )}

      {/* リスト */}
      {loading ? (
        <div className="text-center py-8 text-ink-muted text-sm">読み込み中...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-10 text-ink-muted text-sm">
          <p className="text-3xl mb-2">🛒</p>
          <p>買い物メモがありません</p>
          <p className="text-xs mt-1">右下のボタンから追加してください</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div
              key={item.id}
              className="bg-surface rounded-xl border border-line-subtle px-3 py-3 flex items-center gap-3 shadow-sm"
            >
              {/* チェックボックス */}
              <button
                onClick={() => toggleSelect(item.id)}
                className={
                  'w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-colors ' +
                  (selected.has(item.id)
                    ? 'bg-primary-500 border-primary-500'
                    : 'border-line-strong bg-surface')
                }
              >
                {selected.has(item.id) && (
                  <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                    <path d="M1 4L4 7.5L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>

              {/* 名前 / メモ / 予算 */}
              <div className="flex-1 min-w-0">
                <span className="block text-sm text-ink-strong truncate">{item.name}</span>
                {(item.memo || item.budget_amount > 0) && (
                  <span className="block text-xs text-ink-muted truncate">
                    {item.memo}
                    {item.memo && item.budget_amount > 0 ? ' ・ ' : ''}
                    {item.budget_amount > 0 ? `予算 ¥${item.budget_amount.toLocaleString()}` : ''}
                  </span>
                )}
              </div>

              {/* 編集・削除ボタン */}
              <div className="flex gap-1">
                <button
                  onClick={() => openEditDialog(item)}
                  className="p-1.5 text-ink-muted active:text-primary-500 rounded-lg"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button
                  onClick={() => void handleDelete(item.id)}
                  className="p-1.5 text-ink-muted active:text-danger-500 rounded-lg"
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
      {selected.size > 0 ? (
        <div className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] left-0 right-0 max-w-md mx-auto px-4 z-20">
          <button
            onClick={() => setShowDialog(true)}
            className="w-full py-3.5 rounded-2xl bg-primary-500 text-white font-medium text-sm shadow-lg active:bg-primary-600"
          >
            {selected.size}件を購入済みとして記録
          </button>
        </div>
      ) : (
        /* FAB（追加） */
        <div className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] left-0 right-0 max-w-md mx-auto flex justify-end pr-5 pointer-events-none z-20">
          <button
            onClick={openAddDialog}
            className="pointer-events-auto w-14 h-14 rounded-full bg-primary-500 text-white shadow-lg active:bg-primary-600 flex items-center justify-center"
            aria-label="買い物メモを追加"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
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

      {/* 追加・編集ダイアログ */}
      {showItemDialog && (
        <ShoppingItemDialog
          item={editingItem ?? undefined}
          onConfirm={handleSaveItem}
          onCancel={() => { setShowItemDialog(false); setEditingItem(null) }}
        />
      )}
    </div>
  )
}
