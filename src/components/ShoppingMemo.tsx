import { useState } from 'react'
import type { CategoryInfo } from '../constants'
import { STORE_TYPES } from '../constants'
import type { ShoppingItem } from '../lib/database.types'
import { transactionService } from '../lib/services/transactionService'
import { useShoppingMemoQuery, useShoppingMemoAdd, useShoppingMemoUpdate, useShoppingMemoDelete } from '../hooks/queries/useShoppingMemoQuery'
import PurchaseDialog from './PurchaseDialog'
import ShoppingItemDialog from './ShoppingItemDialog'
import ConfirmDialog from './ui/ConfirmDialog'
import FabButton from './ui/FabButton'

interface Props {
  userId: string
  expenseCategories: CategoryInfo[]
  onTransactionAdded?: () => void
}

interface GroupedItems {
  groupName: string
  items: ShoppingItem[]
}

function groupItems(items: ShoppingItem[]): GroupedItems[] {
  const map = new Map<string, ShoppingItem[]>()
  // グループなし（category = ''）は最後に
  const ungrouped: ShoppingItem[] = []
  for (const item of items) {
    const g = item.category ?? ''
    if (!g) { ungrouped.push(item); continue }
    if (!map.has(g)) map.set(g, [])
    map.get(g)!.push(item)
  }
  const result: GroupedItems[] = []
  map.forEach((its, name) => result.push({ groupName: name, items: its }))
  if (ungrouped.length > 0) result.push({ groupName: '', items: ungrouped })
  return result
}

export default function ShoppingMemo({ userId, expenseCategories, onTransactionAdded }: Props) {
  const { data: items = [], isLoading: loading, error: queryError } = useShoppingMemoQuery(userId)
  const addMutation = useShoppingMemoAdd(userId)
  const updateMutation = useShoppingMemoUpdate(userId)
  const deleteMutation = useShoppingMemoDelete(userId)
  const error = queryError ? (queryError instanceof Error ? queryError.message : 'データの読み込みに失敗しました') : null

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showDialog, setShowDialog] = useState(false)
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null)
  const [addingToGroup, setAddingToGroup] = useState<string | null>(null)
  const [showItemDialog, setShowItemDialog] = useState(false)
  const [confirmDeleteSelected, setConfirmDeleteSelected] = useState(false)

  function openAddDialog(group?: string) {
    setEditingItem(null)
    setAddingToGroup(group ?? null)
    setShowItemDialog(true)
  }

  function openEditDialog(item: ShoppingItem) {
    setEditingItem(item)
    setShowItemDialog(true)
  }

  async function handleSaveItem(name: string, memo: string | null, budgetAmount: number, group: string) {
    if (editingItem) {
      await updateMutation.mutateAsync({ id: editingItem.id, name, memo, budgetAmount, group })
    } else {
      await addMutation.mutateAsync({ name, memo, budgetAmount, group })
    }
    setShowItemDialog(false)
    setEditingItem(null)
    setAddingToGroup(null)
  }

  async function handleDeleteSelected() {
    const ids = [...selected]
    try {
      await deleteMutation.mutateAsync(ids)
      setSelected(new Set())
    } finally {
      setConfirmDeleteSelected(false)
    }
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  function toggleGroup(groupItems: ShoppingItem[]) {
    const ids = groupItems.map(it => it.id)
    const allSelected = ids.every(id => selected.has(id))
    setSelected(prev => {
      const n = new Set(prev)
      if (allSelected) { ids.forEach(id => n.delete(id)) }
      else { ids.forEach(id => n.add(id)) }
      return n
    })
  }

  async function handlePurchase(category: string, amount: number, memo: string, date: string, storeType: string | null, paymentType: string | null) {
    await transactionService.insert({
      user_id: userId,
      type: 'expense',
      expense_kind: 'one_time',
      date,
      category,
      amount,
      memo: memo || null,
      store_type: storeType,
      meal_type: null,
      payment_type: paymentType,
      payment_method: null,
      recurring_rule_id: null,
    })
    const ids = [...selected]
    await deleteMutation.mutateAsync(ids)
    setSelected(new Set())
    setShowDialog(false)
    onTransactionAdded?.()
  }

  const selectedItems = items.filter(it => selected.has(it.id))
  const grouped = groupItems(items)
  const existingGroups = [...new Set(items.map(it => it.category ?? '').filter(Boolean))]

  // 選択アイテムが全て同じグループかつ STORE_TYPES に一致する場合、店舗種別を自動選択
  const inferredStoreType = (() => {
    const groups = [...new Set(selectedItems.map(it => it.category ?? ''))]
    if (groups.length === 1 && STORE_TYPES.some(st => st.name === groups[0])) return groups[0]
    return undefined
  })()

  return (
    <div className="p-4 pb-24 space-y-4">
      {error && (
        <div className="bg-danger-50 border border-danger-200 rounded-xl px-4 py-3 text-sm text-danger-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-ink-muted text-sm">読み込み中...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-10 text-ink-muted text-sm">
          <p className="text-3xl mb-2">🛒</p>
          <p>買い物メモがありません</p>
          <p className="text-xs mt-1">右下のボタンから追加してください</p>
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map(({ groupName, items: groupedItems }) => {
            const key = groupName || '__ungrouped__'
            const allSelected = groupedItems.every(it => selected.has(it.id))
            const someSelected = groupedItems.some(it => selected.has(it.id))

            return (
              <div key={key} className="bg-surface border border-line-subtle rounded-2xl shadow-sm overflow-hidden">
                {/* グループヘッダー */}
                <div className="flex items-center gap-2 px-3 py-2.5">
                  {/* 全選択チェックボックス */}
                  <button
                    onClick={() => toggleGroup(groupedItems)}
                    className="flex-shrink-0"
                    aria-label={`${groupName || 'グループなし'}を全選択`}
                  >
                    <div
                      className={
                        'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ' +
                        (allSelected
                          ? 'bg-primary-500 border-primary-500'
                          : someSelected
                          ? 'bg-primary-100 border-primary-400'
                          : 'border-line-strong bg-surface')
                      }
                    >
                      {allSelected && (
                        <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                          <path d="M1 4L4 7.5L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                      {someSelected && !allSelected && (
                        <svg width="9" height="2" viewBox="0 0 9 2" fill="none">
                          <line x1="1" y1="1" x2="8" y2="1" stroke="#6366f1" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      )}
                    </div>
                  </button>

                  {/* アイコン・グループ名・件数 */}
                  <span className="text-base leading-none flex-shrink-0">
                    {STORE_TYPES.find(st => st.name === groupName)?.icon ?? (groupName ? '🛍️' : '📋')}
                  </span>
                  <span className="text-sm font-semibold text-ink-strong truncate flex-1 min-w-0">
                    {groupName || 'グループなし'}
                  </span>

                  {/* グループへ追加ボタン */}
                  <button
                    onClick={() => openAddDialog(groupName)}
                    className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-ink-muted active:bg-surface-subtle"
                    aria-label={`${groupName || 'グループなし'}にアイテムを追加`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                  </button>
                </div>

                {/* アイテムリスト */}
                <div className="border-t border-line-subtle divide-y divide-line-subtle">
                    {groupedItems.map(item => (
                      <div
                        key={item.id}
                        onClick={() => toggleSelect(item.id)}
                        className="px-3 py-3 flex items-center gap-3 cursor-pointer active:bg-surface-subtle"
                      >
                        {/* チェックボックス */}
                        <div
                          className={
                            'w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-colors pointer-events-none ' +
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
                        </div>

                        {/* 名前 / メモ / 予算 */}
                        <div className="flex-1 min-w-0">
                          <span className="block text-sm text-ink-strong truncate">{item.name}</span>
                          {(item.memo || item.budget_amount > 0) && (
                            <span className="block text-xs text-ink-muted truncate">
                              {item.memo}
                              {item.memo && item.budget_amount > 0 ? ' / ' : ''}
                              {item.budget_amount > 0 ? `予算 ¥${item.budget_amount.toLocaleString()}` : ''}
                            </span>
                          )}
                        </div>

                        {/* 編集ボタン */}
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditDialog(item) }}
                          className="p-1.5 text-ink-muted active:text-primary-500 rounded-lg"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 購入済みボタン（選択時に表示） */}
      {selected.size > 0 ? (
        <div className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] left-0 right-0 max-w-md mx-auto px-4 z-20 flex gap-2">
          <button
            onClick={() => setConfirmDeleteSelected(true)}
            className="py-3.5 px-4 rounded-2xl bg-danger-500 text-white font-medium text-sm shadow-lg active:bg-danger-600 flex items-center justify-center"
            aria-label="選択項目を削除"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
          <button
            onClick={() => setShowDialog(true)}
            className="flex-1 py-3.5 rounded-2xl bg-primary-500 text-white font-medium text-sm shadow-lg active:bg-primary-600"
          >
            {selected.size}件を購入済みとして記録
          </button>
        </div>
      ) : (
        /* FAB（追加） */
        <div className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] left-0 right-0 max-w-md mx-auto flex justify-end pr-5 pointer-events-none z-20">
          <FabButton onClick={() => openAddDialog()} ariaLabel="買い物メモを追加" />
        </div>
      )}

      {/* 購入記録ボトムシート */}
      <PurchaseDialog
        isOpen={showDialog}
        itemNames={selectedItems.map(it => it.name)}
        expenseCategories={expenseCategories}
        initialStoreType={inferredStoreType}
        onConfirm={handlePurchase}
        onCancel={() => setShowDialog(false)}
      />

      {/* 追加・編集ボトムシート */}
      <ShoppingItemDialog
        isOpen={showItemDialog}
        item={editingItem ?? undefined}
        defaultGroup={addingToGroup ?? undefined}
        groups={existingGroups}
        onConfirm={handleSaveItem}
        onCancel={() => { setShowItemDialog(false); setEditingItem(null); setAddingToGroup(null) }}
      />
      {confirmDeleteSelected && (
        <ConfirmDialog
          message={`選択中の${selected.size}件を削除しますか？`}
          onConfirm={() => { void handleDeleteSelected() }}
          onCancel={() => setConfirmDeleteSelected(false)}
        />
      )}
    </div>
  )
}
