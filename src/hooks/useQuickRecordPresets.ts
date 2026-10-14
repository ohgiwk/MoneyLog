import { createSyncedStorage } from './syncedStorage'

export interface QuickPreset {
  name?: string
  pinned?: boolean
}

export type Presets = Record<string, QuickPreset>

const presetStorage = createSyncedStorage<Presets>('qrp_', () => ({}))

export const readQuickRecordPresets = presetStorage.read
export const writeQuickRecordPresets = presetStorage.write

export function useQuickRecordPresets(userId: string) {
  const presets = presetStorage.useValue(userId)

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
  if (!presetStorage.has(userId)) return
  presetStorage.write(userId, renamePresetCategory(presetStorage.read(userId), oldName, newName))
}
