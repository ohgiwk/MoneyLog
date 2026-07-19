import { useState } from 'react'
import Modal from './ui/Modal'
import Button from './ui/Button'
import Input from './ui/Input'
import FormLabel from './ui/FormLabel'
import ErrorText from './ui/ErrorText'
import { PAYMENT_TYPES, STORE_TYPES, type PaymentType } from '../constants'
import type { CategoryInfo } from '../constants'
import { todayStr } from '../utils'
import DatePicker from './ui/DatePicker'

const DEFAULT_PAYMENT_KEY = 'moneylog_default_payment'
function loadDefaultPaymentType(): PaymentType {
  try {
    const raw = localStorage.getItem(DEFAULT_PAYMENT_KEY)
    if (raw) return (JSON.parse(raw) as { type: PaymentType }).type
  } catch { /* ignore */ }
  return 'cash'
}

interface Props {
  itemNames: string[]
  expenseCategories: CategoryInfo[]
  initialStoreType?: string
  onConfirm: (category: string, amount: number, memo: string, date: string, storeType: string | null, paymentType: string | null) => Promise<void>
  onCancel: () => void
}

export default function PurchaseDialog({ itemNames, expenseCategories, initialStoreType, onConfirm, onCancel }: Props) {
  const [category, setCategory] = useState(expenseCategories[0]?.name ?? '')
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState(itemNames.join('・'))
  const [date, setDate] = useState(todayStr())
  const [storeType, setStoreType] = useState<string>(initialStoreType ?? '')
  const [paymentType, setPaymentType] = useState<PaymentType | ''>(loadDefaultPaymentType)
  const [showDetails, setShowDetails] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    const parsed = parseInt(amount, 10)
    if (!category) { setError('カテゴリを選択してください'); return }
    if (isNaN(parsed) || parsed <= 0) { setError('金額を入力してください'); return }
    setError(null)
    setSubmitting(true)
    try {
      await onConfirm(category, parsed, memo, date, storeType || null, paymentType || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '記録に失敗しました')
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen onClose={onCancel} position="bottom" className="p-5 space-y-4 max-h-[90vh] overflow-y-auto">
      <h2 className="text-base font-bold text-ink-strong">購入済みとして記録</h2>

      <div className="bg-surface-subtle rounded-xl px-4 py-3">
        <p className="text-xs text-ink-muted mb-1">購入した商品</p>
        <ul className="space-y-0.5">
          {itemNames.map((name, i) => (
            <li key={i} className="text-sm text-ink">• {name}</li>
          ))}
        </ul>
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
                  ? 'border-primary-400 bg-primary-50 text-primary-700'
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
        <FormLabel>合計金額</FormLabel>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted text-sm">¥</span>
          <Input
            variant="dialog"
            type="number"
            inputMode="numeric"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0"
            className="pl-7"
          />
        </div>
      </div>

      <div>
        <FormLabel>メモ（任意）</FormLabel>
        <Input variant="dialog" type="text" value={memo} onChange={e => setMemo(e.target.value)} placeholder="例：スーパーで購入" />
      </div>

      <button
        type="button"
        onClick={() => setShowDetails(v => !v)}
        className="flex items-center gap-1.5 text-xs text-ink-muted"
      >
        <svg
          width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className={'transition-transform ' + (showDetails ? '' : '-rotate-90')}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
        詳細記録（店舗種別・支払い方法）
        {(storeType || paymentType) && !showDetails && (
          <span className="ml-1 text-primary-500">●</span>
        )}
      </button>

      {showDetails && (
        <>
          <div>
            <FormLabel>店舗種別（任意）</FormLabel>
            <div className="grid grid-cols-3 gap-2">
              {STORE_TYPES.map(s => (
                <button
                  key={s.name}
                  onClick={() => setStoreType(prev => prev === s.name ? '' : s.name)}
                  className={
                    'flex items-center gap-1.5 px-2 py-2 rounded-xl border text-xs font-medium transition-colors ' +
                    (storeType === s.name
                      ? 'border-primary-400 bg-primary-50 text-primary-700'
                      : 'border-line text-ink active:bg-surface-subtle')
                  }
                >
                  <span>{s.icon}</span>
                  <span className="truncate">{s.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <FormLabel>支払い方法（任意）</FormLabel>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_TYPES.map(p => (
                <button
                  key={p.type}
                  onClick={() => setPaymentType(prev => prev === p.type ? '' : p.type)}
                  className={
                    'flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-colors ' +
                    (paymentType === p.type
                      ? 'border-primary-400 bg-primary-50 text-primary-700'
                      : 'border-line text-ink active:bg-surface-subtle')
                  }
                >
                  <span>{p.icon}</span>
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

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
