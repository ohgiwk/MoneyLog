import { useState } from 'react'

export interface QuickPreset {
  name?: string
  pinned?: boolean
}

type Presets = Record<string, QuickPreset>

function storageKey(userId: string) {
  return `qrp_${userId}`
}

export function useQuickRecordPresets(userId: string) {
  const [presets, setPresets] = useState<Presets>(() => {
    try {
      const raw = localStorage.getItem(storageKey(userId))
      return raw ? (JSON.parse(raw) as Presets) : {}
    } catch {
      return {}
    }
  })

  function updatePreset(key: string, patch: Partial<QuickPreset>) {
    setPresets((prev) => {
      const merged = { ...prev[key], ...patch }
      // 空オブジェクトなら削除
      const hasData = merged.name || merged.pinned
      const next = { ...prev }
      if (hasData) {
        next[key] = merged
      } else {
        delete next[key]
      }
      try {
        localStorage.setItem(storageKey(userId), JSON.stringify(next))
      } catch {}
      return next
    })
  }

  return { presets, updatePreset }
}
