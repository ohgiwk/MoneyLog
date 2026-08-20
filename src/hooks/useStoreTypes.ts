import { useCallback, useState } from 'react'
import { STORE_TYPES } from '../constants'

export interface StoreTypeItem {
  id: string
  name: string
  icon: string
}

const STORE_TYPES_KEY = 'moneylog_store_types'

function loadOrInitStoreTypes(): StoreTypeItem[] {
  try {
    const raw = localStorage.getItem(STORE_TYPES_KEY)
    if (raw) {
      const stored = JSON.parse(raw) as StoreTypeItem[]
      // 定数に存在するが保存データにない項目を「その他」の直前に追加
      const storedNames = new Set(stored.map((s) => s.name))
      const missing = STORE_TYPES.filter((st) => !storedNames.has(st.name)).map((st) => ({
        id: crypto.randomUUID(),
        name: st.name,
        icon: st.icon,
      }))
      if (missing.length === 0) return stored
      const otherIndex = stored.findIndex((s) => s.name === 'その他')
      const merged =
        otherIndex >= 0
          ? [...stored.slice(0, otherIndex), ...missing, ...stored.slice(otherIndex)]
          : [...stored, ...missing]
      localStorage.setItem(STORE_TYPES_KEY, JSON.stringify(merged))
      return merged
    }
  } catch (_) {
    // localStorage unavailable or corrupt — fall through to defaults
  }
  const defaults = STORE_TYPES.map((st) => ({
    id: crypto.randomUUID(),
    name: st.name,
    icon: st.icon,
  }))
  localStorage.setItem(STORE_TYPES_KEY, JSON.stringify(defaults))
  return defaults
}

function save(items: StoreTypeItem[]) {
  localStorage.setItem(STORE_TYPES_KEY, JSON.stringify(items))
}

export function useStoreTypes() {
  const [items, setItems] = useState<StoreTypeItem[]>(() => loadOrInitStoreTypes())

  const addItem = useCallback((name: string, icon: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setItems((prev) => {
      const next = [...prev, { id: crypto.randomUUID(), name: trimmed, icon: icon.trim() || '🏷️' }]
      save(next)
      return next
    })
  }, [])

  const updateItem = useCallback((id: string, name: string, icon: string) => {
    setItems((prev) => {
      const next = prev.map((it) =>
        it.id === id ? { ...it, name: name.trim(), icon: icon.trim() || '🏷️' } : it
      )
      save(next)
      return next
    })
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((it) => it.id !== id)
      save(next)
      return next
    })
  }, [])

  const reorder = useCallback((next: StoreTypeItem[]) => {
    save(next)
    setItems(next)
  }, [])

  return { items, addItem, updateItem, removeItem, reorder }
}
