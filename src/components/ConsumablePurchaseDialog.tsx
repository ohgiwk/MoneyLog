import { useEffect, useState } from 'react'
import BottomSheet from './ui/BottomSheet'
import Input from './ui/Input'
import FormLabel from './ui/FormLabel'
import ErrorText from './ui/ErrorText'
import type { Consumable } from '../lib/database.types'
import type { CategoryInfo } from '../constants'
import { todayStr } from '../utils'
import DatePicker from './ui/DatePicker'

interface Props {
  isOpen: boolean
  consumable: Consumable | null
  householdMembers: number
  expenseCategories: CategoryInfo[]
  onConfirm: (date: string, category: string, amount: number, memo: string) => Promise<void>
  onCancel: () => void
}

export default function ConsumablePurchaseDialog({
  isOpen,
  consumable,
  householdMembers,
  expenseCategories,
  onConfirm,
  onCancel,
}: Props) {
  const getDefaultCategory = (c: Consumable | null) =>
    c && expenseCategories.some((cat) => cat.name === c.category) ? c.category : expenseCategories[0]?.name ?? ''
  const getDefaultAmount = (c: Consumable | null) =>
    c ? c.amount * c.quantity * (c.members_scale ? householdMembers : 1) : 0

  const [date, setDate] = useState(todayStr())
  const [category, setCategory] = useState(() => getDefaultCategory(consumable))
  const [amount, setAmount] = useState(() => String(getDefaultAmount(consumable)))
  const [memo, setMemo] = useState(() => (consumable ? `${consumable.name}を購入` : ''))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 閉じるアニメーション中もコンテンツを表示するために最後の非null値を保持
  const [lastConsumable, setLastConsumable] = useState<Consumable | null>(consumable)
  useEffect(() => {
    if (consumable) setLastConsumable(consumable)
  }, [consumable])
  const c = consumable ?? lastConsumable

  // consumableが変わったらフォームをリセット
  useEffect(() => {
    if (consumable) {
      setDate(todayStr())
      setCategory(getDefaultCategory(consumable))
      setAmount(String(getDefaultAmount(consumable)))
      setMemo(`${consumable.name}を購入`)
      setError(null)
    }
  }, [consumable?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit() {
    if (!consumable) return
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
    <BottomSheet
      isOpen={isOpen}
      onClose={onCancel}
      title="購入済みとして記録"
      footer={
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-3.5 text-base rounded-[2rem] shadow-lg bg-danger-500 active:bg-danger-600 text-white font-semibold disabled:opacity-50"
        >
          {submitting ? '記録中...' : '記録する'}
        </button>
      }
    >
      {c && (
        <div className="space-y-4">
          <div className="bg-surface rounded-xl px-4 py-3">
            <p className="text-xs text-ink-muted mb-0.5">定期購入品目</p>
            <p className="text-sm font-semibold text-ink-strong">{c.name}</p>
            <p className="text-xs text-ink-muted mt-0.5">
              {c.amount}円 × {c.quantity}個{c.members_scale ? ` × ${householdMembers}人` : ''} = ¥{getDefaultAmount(c).toLocaleString()}
            </p>
          </div>

          <DatePicker label="購入日" value={date} onChange={setDate} />

          <div className="rounded-xl px-4 py-3 bg-danger-500">
            <label className="text-xs text-white/80 font-bold">金額</label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                type="number"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1"
              />
              <span className="text-base text-white font-medium">円</span>
            </div>
          </div>

          <div>
            <FormLabel>カテゴリ</FormLabel>
            <div className="grid grid-cols-3 gap-2">
              {expenseCategories.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => setCategory(cat.name)}
                  className={
                    'flex items-center gap-1.5 px-2 py-2 rounded-xl border text-xs font-medium transition-colors ' +
                    (category === cat.name
                      ? 'border-primary-400 bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-400'
                      : 'border-line text-ink active:bg-surface-subtle')
                  }
                >
                  <span>{cat.icon}</span>
                  <span className="truncate">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <FormLabel>メモ（任意）</FormLabel>
            <Input type="text" value={memo} onChange={(e) => setMemo(e.target.value)} />
          </div>

          <ErrorText>{error}</ErrorText>
        </div>
      )}
    </BottomSheet>
  )
}
