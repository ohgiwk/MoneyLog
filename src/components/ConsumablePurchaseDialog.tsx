import { useState } from 'react'
import Modal from './ui/Modal'
import Button from './ui/Button'
import Input from './ui/Input'
import FormLabel from './ui/FormLabel'
import ErrorText from './ui/ErrorText'
import type { Consumable } from '../lib/database.types'
import type { CategoryInfo } from '../constants'
import { todayStr } from '../utils'
import DatePicker from './ui/DatePicker'

interface Props {
  consumable: Consumable
  householdMembers: number
  expenseCategories: CategoryInfo[]
  onConfirm: (date: string, category: string, amount: number, memo: string) => Promise<void>
  onCancel: () => void
}

export default function ConsumablePurchaseDialog({
  consumable: c,
  householdMembers,
  expenseCategories,
  onConfirm,
  onCancel,
}: Props) {
  const defaultCategory = expenseCategories.some((cat) => cat.name === c.category)
    ? c.category
    : expenseCategories[0]?.name ?? ''
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
    <Modal isOpen onClose={onCancel} position="center" className="p-5 space-y-4 max-h-[85vh] overflow-y-auto w-full max-w-md mx-4">
      <h2 className="text-base font-bold text-ink-strong">購入済みとして記録</h2>

      <div className="bg-surface-subtle rounded-xl px-4 py-3">
        <p className="text-xs text-ink-muted mb-0.5">定期購入品目</p>
        <p className="text-sm font-semibold text-ink-strong">{c.name}</p>
        <p className="text-xs text-ink-muted mt-0.5">
          {c.amount}円 × {c.quantity}個{c.members_scale ? ` × ${householdMembers}人` : ''} = ¥{defaultAmount.toLocaleString()}
        </p>
      </div>

      <div>
        <DatePicker label="購入日" value={date} onChange={setDate} />
      </div>

      <div>
        <FormLabel>カテゴリ</FormLabel>
        <div className="grid grid-cols-3 gap-2">
          {expenseCategories.map(cat => (
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
        <FormLabel>金額</FormLabel>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted text-sm">¥</span>
          <Input
            variant="dialog"
            type="number"
            inputMode="numeric"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="pl-7"
          />
        </div>
      </div>

      <div>
        <FormLabel>メモ（任意）</FormLabel>
        <Input variant="dialog" type="text" value={memo} onChange={e => setMemo(e.target.value)} />
      </div>

      <ErrorText>{error}</ErrorText>

      <div className="flex gap-2 pt-1">
        <Button variant="secondary" onClick={onCancel}>キャンセル</Button>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? '記録中...' : '記録する'}
        </Button>
      </div>
    </Modal>
  )
}
