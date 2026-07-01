import { useState } from 'react'
import type { Consumable } from '../lib/database.types'
import type { CategoryInfo } from '../constants'
import { todayStr } from '../utils'

interface Props {
  consumable: Consumable
  householdMembers: number
  expenseCategories: CategoryInfo[]
  onConfirm: (date: string, category: string, amount: number, memo: string) => Promise<void>
  onCancel: () => void
}

// 定期購入カテゴリ → 臨時出費カテゴリへの対応マップ
const CATEGORY_MAP: Record<string, string> = {
  '衛生・清潔': '日用品',
  'トイレ・洗剤': '日用品',
  'サプリ・医療': '医療費',
  '食品・調味料': '食費',
  'その他': 'その他',
}

export default function ConsumablePurchaseDialog({
  consumable: c,
  householdMembers,
  expenseCategories,
  onConfirm,
  onCancel,
}: Props) {
  const defaultCategory =
    CATEGORY_MAP[c.category] ?? expenseCategories[0]?.name ?? ''
  const defaultAmount = c.amount * c.quantity * (c.members_scale ? householdMembers : 1)

  const [date, setDate] = useState(todayStr())
  const [category, setCategory] = useState(defaultCategory)
  const [amount, setAmount] = useState(String(defaultAmount))
  const [memo, setMemo] = useState(`${c.name}を購入`)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    const parsed = parseInt(amount, 10)
    if (!category) { setError('カテゴリを選択してください'); return }
    if (isNaN(parsed) || parsed <= 0) { setError('金額を入力してください'); return }
    setError(null)
    setSubmitting(true)
    try {
      await onConfirm(date, category, parsed, memo)
    } catch (err) {
      setError(err instanceof Error ? err.message : '記録に失敗しました')
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center sm:items-center">
      <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 space-y-4 shadow-xl">
        <h2 className="text-base font-bold text-slate-800">購入済みとして記録</h2>

        {/* 品目情報 */}
        <div className="bg-slate-50 rounded-xl px-4 py-3">
          <p className="text-xs text-slate-500 mb-0.5">定期購入品目</p>
          <p className="text-sm font-semibold text-slate-800">{c.name}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {c.amount}円 × {c.quantity}個{c.members_scale ? ` × ${householdMembers}人` : ''} = ¥{defaultAmount.toLocaleString()}
          </p>
        </div>

        {/* 購入日 */}
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
          <label className="block text-xs text-slate-500 mb-1">金額</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">¥</span>
            <input
              type="number"
              inputMode="numeric"
              value={amount}
              onChange={e => setAmount(e.target.value)}
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
