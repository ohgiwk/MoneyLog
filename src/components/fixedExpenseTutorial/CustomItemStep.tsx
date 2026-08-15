import { useState } from 'react'
import { FIXED_EXPENSE_CATEGORIES } from '../../constants'
import type { MultiItem } from './data'
import Input from '../ui/Input'
import Button from '../ui/Button'

interface CustomItemStepProps {
  items: MultiItem[]
  onAdd: (item: MultiItem) => void
  onRemove: (index: number) => void
}

export function CustomItemStep({ items, onAdd, onRemove }: CustomItemStepProps) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState(
    FIXED_EXPENSE_CATEGORIES[FIXED_EXPENSE_CATEGORIES.length - 1].name
  )
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
      <div className="space-y-2 mb-4 shrink-0 bg-surface rounded-2xl p-4 shadow-sm border border-line-subtle">
        <Input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: 町内会費"
        />
        <div className="flex gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="flex-1 min-w-0 border border-line rounded-xl px-3 py-2 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary-300"
          >
            {FIXED_EXPENSE_CATEGORIES.map((c) => (
              <option key={c.name} value={c.name}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
          <div className="flex rounded-xl overflow-hidden border border-line shrink-0 text-xs">
            <button
              type="button"
              onClick={() => setCycle('monthly')}
              className={
                'px-3 transition ' +
                (cycle === 'monthly' ? 'bg-surface-strong text-white' : 'bg-surface text-ink-muted')
              }
            >
              月
            </button>
            <button
              type="button"
              onClick={() => setCycle('yearly')}
              className={
                'px-3 transition border-l border-line ' +
                (cycle === 'yearly' ? 'bg-surface-strong text-white' : 'bg-surface text-ink-muted')
              }
            >
              年
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted">
              円
            </span>
          </div>
          <Button
            type="button"
            onClick={handleAdd}
            disabled={!name.trim()}
            className="px-4 shrink-0 flex-none"
          >
            追加
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {items.length === 0 ? (
          <p className="text-sm text-ink-muted">まだ項目が追加されていません</p>
        ) : (
          items.map((item, i) => {
            const catInfo = FIXED_EXPENSE_CATEGORIES.find((c) => c.name === item.category)
            return (
              <div
                key={`${item.name}-${i}`}
                className="flex items-center gap-3 bg-surface rounded-xl px-3 py-2.5 shadow-sm"
              >
                <span className="text-lg shrink-0">{catInfo?.icon ?? '📦'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink truncate">{item.name}</div>
                  <div className="text-xs text-ink-muted">
                    {item.category}
                    {item.cycle === 'yearly' ? '・年払い' : ''}
                  </div>
                </div>
                <span className="text-sm text-ink shrink-0">
                  {item.amount ? `¥${Number(item.amount).toLocaleString()}` : '-'}
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  className="text-ink-subtle active:text-danger-500 shrink-0 text-lg leading-none px-1"
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
