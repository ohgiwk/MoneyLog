import { useState, useEffect } from 'react'
import BottomSheet from './ui/BottomSheet'
import Button from './ui/Button'
import Input from './ui/Input'
import type { CategoryInfo } from '../constants'

const EMOJI_SUGGESTIONS = [
  '🍙',
  '🍜',
  '🍺',
  '🎮',
  '🚃',
  '🏠',
  '📱',
  '👗',
  '📚',
  '🏥',
  '💰',
  '💻',
  '🎁',
  '📦',
  '⚡',
  '🛡️',
  '🎬',
  '🏦',
  '🧻',
  '🎵',
  '✈️',
  '🚗',
  '🐾',
  '🛒',
  '💄',
  '🍕',
  '☕',
  '🎨',
  '🏋️',
  '🌿',
]

const COLOR_SUGGESTIONS = [
  '#f97316',
  '#0ea5e9',
  '#6366f1',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#ef4444',
  '#d946ef',
  '#3b82f6',
  '#64748b',
  '#16a34a',
  '#0d9488',
  '#ca8a04',
  '#10b981',
  '#f59e0b',
]

interface Props {
  isOpen: boolean
  initial: CategoryInfo
  onSave: (cat: CategoryInfo) => void
  onClose: () => void
}

export default function CategoryFormDialog({ isOpen, initial, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<CategoryInfo>(initial)

  useEffect(() => {
    if (isOpen) setDraft(initial)
  }, [isOpen, initial])

  function handleSave() {
    if (!draft.name.trim()) return
    onSave({ ...draft, name: draft.name.trim() })
  }

  const title = initial.name ? 'カテゴリを編集' : 'カテゴリを追加'

  const footer = (
    <Button fullWidth size="lg" onClick={handleSave} disabled={!draft.name.trim()}>
      保存する
    </Button>
  )

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={title} footer={footer}>
      <div className="space-y-5">
        <div>
          <label className="text-xs font-medium text-ink-muted">カテゴリ名</label>
          <Input
            type="text"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="例: 食費"
            className="mt-1.5"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-ink-muted">アイコン</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {EMOJI_SUGGESTIONS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setDraft((d) => ({ ...d, icon: e }))}
                className={
                  'w-9 h-9 rounded-lg text-lg flex items-center justify-center border ' +
                  (draft.icon === e
                    ? 'border-primary-400 bg-primary-50 dark:bg-primary-950/60'
                    : 'border-line bg-surface-subtle active:bg-surface-hover')
                }
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-ink-muted">カラー</label>
          <div className="flex flex-wrap gap-2 mt-2">
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
      </div>
    </BottomSheet>
  )
}
