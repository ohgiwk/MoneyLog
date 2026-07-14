import { useState } from 'react'
import Modal from './ui/Modal'
import Button from './ui/Button'
import Input from './ui/Input'
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
    <Modal isOpen onClose={onClose} position="bottom" className="w-full max-w-md p-5 space-y-4 pb-8">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-ink">カテゴリ編集</span>
        <button onClick={onClose} className="text-ink-muted active:text-ink px-1 text-xl">✕</button>
      </div>

      <div>
        <label className="text-xs text-ink-muted">カテゴリ名</label>
        <Input
          type="text"
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          placeholder="例: 食費"
          className="mt-1"
        />
      </div>

      <div>
        <label className="text-xs text-ink-muted">アイコン</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {EMOJI_SUGGESTIONS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setDraft((d) => ({ ...d, icon: e }))}
              className={
                'w-9 h-9 rounded-lg text-lg flex items-center justify-center border ' +
                (draft.icon === e
                  ? 'border-primary-400 bg-primary-50'
                  : 'border-line bg-surface')
              }
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-ink-muted">カラー</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {COLOR_SUGGESTIONS.map((col) => (
            <button
              key={col}
              type="button"
              onClick={() => setDraft((d) => ({ ...d, color: col }))}
              className={
                'w-7 h-7 rounded-full border-2 transition-transform ' +
                (draft.color === col ? 'border-line-strong scale-110' : 'border-transparent')
              }
              style={{ backgroundColor: col }}
            />
          ))}
        </div>
      </div>

      <Button fullWidth onClick={handleSave}>保存</Button>
    </Modal>
  )
}
