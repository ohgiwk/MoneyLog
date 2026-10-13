import { useEffect, useState } from 'react'

export interface QuickPreset {
  name?: string
  pinned?: boolean
}

export type Presets = Record<string, QuickPreset>

function storageKey(userId: string) {
  return `qrp_${userId}`
}

// 同じ画面に複数のリスト（長押しシートと記録タブ）が出るため、変更を他のインスタンスへ伝える
const CHANGE_EVENT = 'quick-record-presets-change'
type ChangeDetail = { userId: string; presets: Presets }

export function readQuickRecordPresets(userId: string): Presets {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    return raw ? (JSON.parse(raw) as Presets) : {}
  } catch {
    return {}
  }
}

export function writeQuickRecordPresets(userId: string, presets: Presets) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(presets))
  } catch {
    // 保存できなくても、表示中の画面には変更を反映する
  }
  window.dispatchEvent(new CustomEvent<ChangeDetail>(CHANGE_EVENT, { detail: { userId, presets } }))
}

export function useQuickRecordPresets(userId: string) {
  const [presets, setPresets] = useState<Presets>(() => readQuickRecordPresets(userId))

  useEffect(() => {
    function sync(e: Event) {
      const detail = (e as CustomEvent<ChangeDetail>).detail
      if (detail.userId === userId) setPresets(detail.presets)
    }
    window.addEventListener(CHANGE_EVENT, sync)
    return () => window.removeEventListener(CHANGE_EVENT, sync)
  }, [userId])

  function updatePreset(key: string, patch: Partial<QuickPreset>) {
    const merged = { ...presets[key], ...patch }
    // 空オブジェクトなら削除
    const hasData = merged.name || merged.pinned
    const next = { ...presets }
    if (hasData) {
      next[key] = merged
    } else {
      delete next[key]
    }
    writeQuickRecordPresets(userId, next)
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
