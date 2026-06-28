import { useState } from 'react'
import type { CategoryInfo } from '../constants'

const EMOJI_SUGGESTIONS = [
  '🍙', '🍜', '🍺', '🎮', '🚃', '🏠', '📱', '👗', '📚', '🏥',
  '💰', '💻', '🎁', '📦', '⚡', '🛡️', '🎬', '🏦', '🧻', '🎵',
  '✈️', '🚗', '🐾', '🛒', '💄', '🍕', '☕', '🎨', '🏋️', '🌿',
]

const COLOR_SUGGESTIONS = [
  '#f97316', '#0ea5e9', '#6366f1', '#8b5cf6', '#06b6d4',
  '#ec4899', '#ef4444', '#d946ef', '#3b82f6', '#64748b',
  '#16a34a', '#0d9488', '#ca8a04', '#10b981', '#f59e0b',
]

interface Props {
  initial: CategoryInfo
  onSave: (cat: CategoryInfo) => void
  onClose: () => void
}

export default function CategoryFormDialog({ initial, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<CategoryInfo>(initial)

  function handleSave() {
    if (!draft.name.trim()) return
    onSave({ ...draft, name: draft.name.trim() })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-t-2xl p-5 space-y-4 pb-8">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-700">カテゴリ編集</span>
          <button onClick={onClose} className="text-slate-400 active:text-slate-600 px-1 text-xl">
            ✕
          </button>
        </div>

        <div>
          <label className="text-xs text-slate-400">カテゴリ名</label>
          <input
            type="text"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="例: 食費"
            className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
        </div>

        <div>
          <label className="text-xs text-slate-400">アイコン</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {EMOJI_SUGGESTIONS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setDraft((d) => ({ ...d, icon: e }))}
                className={
                  'w-9 h-9 rounded-lg text-lg flex items-center justify-center border ' +
                  (draft.icon === e
                    ? 'border-emerald-400 bg-emerald-50'
                    : 'border-slate-200 bg-white')
                }
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-400">カラー</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {COLOR_SUGGESTIONS.map((col) => (
              <button
                key={col}
                type="button"
                onClick={() => setDraft((d) => ({ ...d, color: col }))}
                className={
                  'w-7 h-7 rounded-full border-2 transition-transform ' +
                  (draft.color === col ? 'border-slate-600 scale-110' : 'border-transparent')
                }
                style={{ backgroundColor: col }}
              />
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full py-3 rounded-xl bg-emerald-500 text-white text-sm font-semibold active:bg-emerald-600"
        >
          保存
        </button>
      </div>
    </div>
  )
}
