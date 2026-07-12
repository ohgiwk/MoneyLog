import { useState } from 'react'
import type { CategoryInfo } from '../constants'
import CategoryFormDialog from './CategoryFormDialog'

interface Props {
  categories: CategoryInfo[]
  onChange: (cats: CategoryInfo[]) => void
}

export default function CategoryList({ categories, onChange }: Props) {
  const [dialog, setDialog] = useState<{ index: number | null } | null>(null)

  function openAdd() {
    setDialog({ index: null })
  }

  function openEdit(i: number) {
    setDialog({ index: i })
  }

  function handleSave(cat: CategoryInfo) {
    if (dialog === null) return
    const next = [...categories]
    if (dialog.index !== null) {
      next[dialog.index] = cat
    } else {
      next.push(cat)
    }
    onChange(next)
    setDialog(null)
  }

  function remove(i: number) {
    onChange(categories.filter((_, idx) => idx !== i))
  }

  const dialogInitial: CategoryInfo =
    dialog?.index !== null && dialog?.index !== undefined
      ? { ...categories[dialog.index] }
      : { name: '', icon: '📦', color: '#64748b' }

  return (
    <>
      <div className="bg-surface rounded-2xl shadow-sm overflow-hidden">
        <ul className="divide-y divide-line-subtle">
          {categories.map((c, i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-3">
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0"
                style={{ backgroundColor: c.color + '22' }}
              >
                {c.icon}
              </span>
              <span className="flex-1 text-sm text-ink">{c.name}</span>
              <button
                onClick={() => openEdit(i)}
                className="text-xs text-ink-muted active:text-ink px-2 py-1"
              >
                編集
              </button>
              <button
                onClick={() => remove(i)}
                className="text-xs text-ink-subtle active:text-danger-400 px-1 py-1"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        <div className="px-4 py-3 border-t border-line-subtle">
          <button
            onClick={openAdd}
            className="w-full py-2 rounded-xl border border-dashed border-line-strong text-sm text-ink-muted active:bg-surface-subtle"
          >
            ＋ カテゴリを追加
          </button>
        </div>
      </div>

      {dialog !== null && (
        <CategoryFormDialog
          initial={dialogInitial}
          onSave={handleSave}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  )
}
