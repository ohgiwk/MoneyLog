import { useState } from 'react'

export interface QuickPreset {
  name?: string
  pinned?: boolean
}

export type Presets = Record<string, QuickPreset>

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

// プリセットのキーは「カテゴリ|金額|メモ」なので、カテゴリ名の変更時にキーを付け替える
export function renamePresetCategory(presets: Presets, oldName: string, newName: string): Presets {
  const prefix = `${oldName}|`
  const next: Presets = {}
  for (const [key, preset] of Object.entries(presets)) {
    next[key.startsWith(prefix) ? `${newName}|${key.slice(prefix.length)}` : key] = preset
  }
  return next
}

export function renameQuickPresetCategory(userId: string, oldName: string, newName: string) {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return
    const next = renamePresetCategory(JSON.parse(raw) as Presets, oldName, newName)
    localStorage.setItem(storageKey(userId), JSON.stringify(next))
  } catch {
    // プリセットは端末ローカルの補助情報なので、失敗しても名前変更自体は続ける
  }
}
