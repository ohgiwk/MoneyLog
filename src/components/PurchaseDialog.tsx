import { useState } from 'react'
import type { CategoryInfo } from '../constants'
import { todayStr } from '../utils'

interface Props {
  itemNames: string[]
  expenseCategories: CategoryInfo[]
  onConfirm: (category: string, amount: number, memo: string, date: string) => Promise<void>
  onCancel: () => void
}

export default function PurchaseDialog({ itemNames, expenseCategories, onConfirm, onCancel }: Props) {
  const [category, setCategory] = useState(expenseCategories[0]?.name ?? '')
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [date, setDate] = useState(todayStr())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    const parsed = parseInt(amount, 10)
    if (!category) { setError('カテゴリを選択してください'); return }
    if (isNaN(parsed) || parsed <= 0) { setError('金額を入力してください'); return }
    setError(null)
    setSubmitting(true)
    try {
      await onConfirm(category, parsed, memo, date)
    } catch (err) {
      setError(err instanceof Error ? err.message : '記録に失敗しました')
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center sm:items-center">
      <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 space-y-4 shadow-xl">
        <h2 className="text-base font-bold text-slate-800">購入済みとして記録</h2>

        {/* 購入アイテム一覧 */}
        <div className="bg-slate-50 rounded-xl px-4 py-3">
          <p className="text-xs text-slate-500 mb-1">購入した商品</p>
          <ul className="space-y-0.5">
            {itemNames.map((name, i) => (
              <li key={i} className="text-sm text-slate-700">• {name}</li>
            ))}
          </ul>
        </div>

        {/* 日付 */}
        <div>
          <label className="block text-xs text-slate-500 mb-1">購入日</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-emerald-400"
          />
        </div>

        {/* カテゴリ */}
        <div>
          <label className="block text-xs text-slate-500 mb-1">カテゴリ</label>
          <div className="grid grid-cols-3 gap-2">
            {expenseCategories.map(cat => (
              <button
                key={cat.name}
                onClick={() => setCategory(cat.name)}
                className={
                  'flex items-center gap-1.5 px-2 py-2 rounded-xl border text-xs font-medium transition-colors ' +
                  (category === cat.name
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 text-slate-600 active:bg-slate-50')
                }
              >
                <span>{cat.icon}</span>
                <span className="truncate">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 金額 */}
        <div>
          <label className="block text-xs text-slate-500 mb-1">合計金額</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">¥</span>
            <input
              type="number"
              inputMode="numeric"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0"
              className="w-full border border-slate-200 rounded-xl pl-7 pr-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-emerald-400"
            />
          </div>
        </div>

        {/* メモ */}
        <div>
          <label className="block text-xs text-slate-500 mb-1">メモ（任意）</label>
          <input
            type="text"
            value={memo}
            onChange={e => setMemo(e.target.value)}
            placeholder="例：スーパーで購入"
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-emerald-400"
          />
        </div>

        {error && <p className="text-xs text-rose-500">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-sm text-slate-600 active:bg-slate-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-3 rounded-xl bg-emerald-500 text-white text-sm font-medium active:bg-emerald-600 disabled:opacity-50"
          >
            {submitting ? '記録中...' : '記録する'}
          </button>
        </div>
      </div>
    </div>
  )
}
