import { useEffect, useState } from 'react'
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

type TabKey = 'expense' | 'income' | 'fixed'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'expense', label: '支出' },
  { key: 'income', label: '収入' },
  { key: 'fixed', label: '固定費' },
]

interface DialogProps {
  initial: CategoryInfo
  onSave: (cat: CategoryInfo) => void
  onClose: () => void
}

function CategoryFormDialog({ initial, onSave, onClose }: DialogProps) {
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

interface SectionProps {
  categories: CategoryInfo[]
  onChange: (cats: CategoryInfo[]) => void
}

function CategoryList({ categories, onChange }: SectionProps) {
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
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <ul className="divide-y divide-slate-50">
          {categories.map((c, i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-3">
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0"
                style={{ backgroundColor: c.color + '22' }}
              >
                {c.icon}
              </span>
              <span className="flex-1 text-sm text-slate-700">{c.name}</span>
              <button
                onClick={() => openEdit(i)}
                className="text-xs text-slate-400 active:text-slate-600 px-2 py-1"
              >
                編集
              </button>
              <button
                onClick={() => remove(i)}
                className="text-xs text-slate-300 active:text-rose-400 px-1 py-1"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        <div className="px-4 py-3 border-t border-slate-50">
          <button
            onClick={openAdd}
            className="w-full py-2 rounded-xl border border-dashed border-slate-300 text-sm text-slate-400 active:bg-slate-50"
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

interface Props {
  expenseCategories: CategoryInfo[]
  incomeCategories: CategoryInfo[]
  fixedCategories: CategoryInfo[]
  onUpdateExpense: (cats: CategoryInfo[]) => void
  onUpdateIncome: (cats: CategoryInfo[]) => void
  onUpdateFixed: (cats: CategoryInfo[]) => void
  onBack: () => void
}

export default function CategoryEditScreen({
  expenseCategories,
  incomeCategories,
  fixedCategories,
  onUpdateExpense,
  onUpdateIncome,
  onUpdateFixed,
  onBack,
}: Props) {
  useEffect(() => { window.scrollTo(0, 0) }, [])
  const [activeTab, setActiveTab] = useState<TabKey>('expense')

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col">
      <div className="sticky top-0 z-10 bg-white border-b border-slate-100">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="text-slate-400 active:text-slate-600 text-xl px-1">
            ←
          </button>
          <span className="font-bold text-lg text-slate-800">カテゴリ編集</span>
        </div>
        <div className="flex px-4 gap-1 pb-0">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={
                'flex-1 py-2.5 text-sm font-semibold border-b-2 transition-colors ' +
                (activeTab === t.key
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-slate-400')
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto pb-8">
        {activeTab === 'expense' && (
          <CategoryList categories={expenseCategories} onChange={onUpdateExpense} />
        )}
        {activeTab === 'income' && (
          <CategoryList categories={incomeCategories} onChange={onUpdateIncome} />
        )}
        {activeTab === 'fixed' && (
          <CategoryList categories={fixedCategories} onChange={onUpdateFixed} />
        )}
      </div>
    </div>
  )
}
