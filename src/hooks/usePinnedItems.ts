import { createSyncedStorage } from './syncedStorage'
import type { Transaction } from '../lib/database.types'
import { readQuickRecordPresets, writeQuickRecordPresets } from './useQuickRecordPresets'
import { expenseKey } from '../utils'

// よく記録する出費の「ピン留め」。記録とは独立した項目として端末に保存する
export interface PinnedItem {
  id: string
  name: string | null
  category: string
  amount: number
  memo: string | null
  store_type: string | null
  meal_type: string | null
  payment_type: string | null
  payment_method: string | null
}

export type PinnedItemDraft = Omit<PinnedItem, 'id'>

const pinnedStorage = createSyncedStorage<PinnedItem[]>('qrpin_', () => [])

export const readPinnedItems = pinnedStorage.read
const writePinnedItems = pinnedStorage.write

export function usePinnedItems(userId: string) {
  const items = pinnedStorage.useValue(userId)

  function addItem(draft: PinnedItemDraft) {
    writePinnedItems(userId, [...items, { ...draft, id: crypto.randomUUID() }])
  }

  function updateItem(id: string, draft: PinnedItemDraft) {
    writePinnedItems(
      userId,
      items.map((item) => (item.id === id ? { ...draft, id } : item))
    )
  }

  function removeItem(id: string) {
    writePinnedItems(
      userId,
      items.filter((item) => item.id !== id)
    )
  }

  return { items, addItem, updateItem, removeItem }
}

export function draftFromTx(tx: Transaction, name: string | null): PinnedItemDraft {
  return {
    name,
    category: tx.category,
    amount: tx.amount,
    memo: tx.memo,
    store_type: tx.store_type,
    meal_type: tx.meal_type,
    payment_type: tx.payment_type,
    payment_method: tx.payment_method,
  }
}

// 入力フォームへ複製元として渡すための記録に変換する
export function pinnedItemToTx(item: PinnedItem, userId: string, date: string): Transaction {
  return {
    id: item.id,
    user_id: userId,
    type: 'expense',
    expense_kind: 'one_time',
    date,
    category: item.category,
    amount: item.amount,
    memo: item.memo,
    store_type: item.store_type,
    meal_type: item.meal_type,
    payment_type: item.payment_type,
    payment_method: item.payment_method,
    created_at: '',
  }
}

// 旧形式（よく使う出費に pinned の印を付ける方式）のピン留めを、独立した項目へ移す。
// 元の記録が見つかれば店舗種別・決済方法も引き継ぎ、なければキーから復元する。
// 保存済みの状態だけを見て動くので、複数回呼んでも二重には移行されない
export function migratePinnedPresets(userId: string, frequentTxs: Transaction[]) {
  const presets = readQuickRecordPresets(userId)
  const pinnedKeys = Object.keys(presets).filter((key) => presets[key].pinned)
  if (pinnedKeys.length === 0) return

  const txByKey = new Map(frequentTxs.map((tx) => [expenseKey(tx), tx]))
  const migrated: PinnedItem[] = []
  const nextPresets = { ...presets }
  for (const key of pinnedKeys) {
    const { name } = presets[key]
    const tx = txByKey.get(key)
    // メモには | が含まれうるので、先頭2つだけを区切りとして扱う
    const [category, amount, ...memoParts] = key.split('|')
    const memo = memoParts.join('|')
    migrated.push({
      id: crypto.randomUUID(),
      ...(tx
        ? draftFromTx(tx, name ?? null)
        : {
            name: name ?? null,
            category,
            amount: Number(amount),
            memo: memo || null,
            store_type: null,
            meal_type: null,
            payment_type: null,
            payment_method: null,
          }),
    })
    if (name) nextPresets[key] = { name }
    else delete nextPresets[key]
  }

  writePinnedItems(userId, [...readPinnedItems(userId), ...migrated])
  writeQuickRecordPresets(userId, nextPresets)
}

export function renamePinnedItemCategory(userId: string, oldName: string, newName: string) {
  const items = readPinnedItems(userId)
  if (!items.some((item) => item.category === oldName)) return
  writePinnedItems(
    userId,
    items.map((item) => (item.category === oldName ? { ...item, category: newName } : item))
  )
}
