import { useState } from 'react'
import { FIXED_EXPENSE_CATEGORIES } from '../../constants'
import type { MultiItem } from './data'

interface CustomItemStepProps {
  items: MultiItem[]
  onAdd: (item: MultiItem) => void
  onRemove: (index: number) => void
}

export function CustomItemStep({ items, onAdd, onRemove }: CustomItemStepProps) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState(FIXED_EXPENSE_CATEGORIES[FIXED_EXPENSE_CATEGORIES.length - 1].name)
  const [amount, setAmount] = useState('')
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly')

  function handleAdd() {
    const trimmed = name.trim()
    if (!trimmed) return
    onAdd({ name: trimmed, category, amount, cycle })
    setName('')
    setAmount('')
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* 追加フォーム */}
      <div className="space-y-2 mb-4 shrink-0 bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: 町内会費"
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
        />
        <div className="flex gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="flex-1 min-w-0 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-300"
          >
            {FIXED_EXPENSE_CATEGORIES.map((c) => (
              <option key={c.name} value={c.name}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
          <div className="flex rounded-xl overflow-hidden border border-slate-200 shrink-0 text-xs">
            <button
              type="button"
              onClick={() => setCycle('monthly')}
              className={'px-3 transition ' + (cycle === 'monthly' ? 'bg-slate-700 text-white' : 'bg-white text-slate-400')}
            >
              月
            </button>
            <button
              type="button"
              onClick={() => setCycle('yearly')}
              className={'px-3 transition border-l border-slate-200 ' + (cycle === 'yearly' ? 'bg-slate-700 text-white' : 'bg-white text-slate-400')}
            >
              年
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">円</span>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!name.trim()}
            className="px-4 rounded-xl bg-primary-500 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-semibold active:bg-primary-600 shrink-0"
          >
            追加
          </button>
        </div>
      </div>

      {/* 追加済みリスト */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {items.length === 0 ? (
          <p className="text-sm text-slate-400">まだ項目が追加されていません</p>
        ) : (
          items.map((item, i) => {
            const catInfo = FIXED_EXPENSE_CATEGORIES.find((c) => c.name === item.category)
            return (
              <div key={`${item.name}-${i}`} className="flex items-center gap-3 bg-white rounded-xl px-3 py-2.5 shadow-sm">
                <span className="text-lg shrink-0">{catInfo?.icon ?? '📦'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-700 truncate">{item.name}</div>
                  <div className="text-xs text-slate-400">
                    {item.category}
                    {item.cycle === 'yearly' ? '・年払い' : ''}
                  </div>
                </div>
                <span className="text-sm text-slate-600 shrink-0">
                  {item.amount ? `¥${Number(item.amount).toLocaleString()}` : '-'}
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  className="text-slate-300 active:text-danger-500 shrink-0 text-lg leading-none px-1"
                  aria-label="削除"
                >
                  ×
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
