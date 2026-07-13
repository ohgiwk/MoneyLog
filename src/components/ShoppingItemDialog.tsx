import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { ShoppingItem } from '../lib/database.types'

interface Props {
  item?: ShoppingItem
  onConfirm: (name: string, memo: string | null, budgetAmount: number) => Promise<void>
  onCancel: () => void
}

export default function ShoppingItemDialog({ item, onConfirm, onCancel }: Props) {
  const [name, setName] = useState(item?.name ?? '')
  const [memo, setMemo] = useState(item?.memo ?? '')
  const [budget, setBudget] = useState(item?.budget_amount ? String(item.budget_amount) : '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    const trimmedName = name.trim()
    if (!trimmedName) { setError('商品名を入力してください'); return }
    const parsedBudget = budget.trim() ? parseInt(budget, 10) : 0
    if (budget.trim() && (isNaN(parsedBudget) || parsedBudget < 0)) {
      setError('予算は0以上の数値で入力してください')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await onConfirm(trimmedName, memo.trim() || null, parsedBudget)
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました')
      setSubmitting(false)
    }
  }

  // 祖先の transform/z-index によるスタッキングコンテキストの影響を受けないよう、
  // document.body 直下に portal 描画してヘッダー・下部ナビより確実に手前に表示する
  return createPortal(
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-surface w-full max-w-md rounded-2xl p-5 space-y-4 shadow-xl max-h-[85vh] overflow-y-auto">
        <h2 className="text-base font-bold text-ink-strong">
          {item ? '買い物メモを編集' : '買い物メモを追加'}
        </h2>

        <div>
          <label className="block text-xs text-ink-muted mb-1">商品名</label>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: 牛乳"
            className="w-full border border-line rounded-xl px-3 py-2.5 text-sm text-ink-strong focus:outline-none focus:border-primary-400"
          />
        </div>

        <div>
          <label className="block text-xs text-ink-muted mb-1">メモ（任意）</label>
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="例: 特売のもの"
            className="w-full border border-line rounded-xl px-3 py-2.5 text-sm text-ink-strong focus:outline-none focus:border-primary-400"
          />
        </div>

        <div>
          <label className="block text-xs text-ink-muted mb-1">予算（任意）</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted text-sm">¥</span>
            <input
              type="number"
              inputMode="numeric"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="0"
              className="w-full border border-line rounded-xl pl-7 pr-3 py-2.5 text-sm text-ink-strong focus:outline-none focus:border-primary-400"
            />
          </div>
        </div>

        {error && <p className="text-xs text-danger-500">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border border-line text-sm text-ink active:bg-surface-subtle"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-3 rounded-xl bg-primary-500 text-white text-sm font-medium active:bg-primary-600 disabled:opacity-50"
          >
            {submitting ? '保存中...' : '保存する'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
