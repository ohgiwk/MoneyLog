import { useState, useEffect } from 'react'
import BottomSheet from './ui/BottomSheet'
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
  isOpen: boolean
  itemNames: string[]
  expenseCategories: CategoryInfo[]
  initialStoreType?: string
  onConfirm: (category: string, amount: number, memo: string, date: string, storeType: string | null, paymentType: string | null) => Promise<void>
  onCancel: () => void
}

export default function PurchaseDialog({ isOpen, itemNames, expenseCategories, initialStoreType, onConfirm, onCancel }: Props) {
  const [category, setCategory] = useState(expenseCategories[0]?.name ?? '')
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState(itemNames.join('・'))
  const [date, setDate] = useState(todayStr())
  const [storeType, setStoreType] = useState<string>(initialStoreType ?? '')
  const [paymentType, setPaymentType] = useState<PaymentType | ''>(loadDefaultPaymentType)
  const [showDetails, setShowDetails] = useState(false)
  const [storeTypeOpen, setStoreTypeOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const selectedStoreType = STORE_TYPES.find(s => s.name === storeType)

  // 閉じるアニメーション中もコンテンツを表示するために最後の非空値を保持
  const [lastItemNames, setLastItemNames] = useState<string[]>(itemNames)
  useEffect(() => {
    if (itemNames.length > 0) setLastItemNames(itemNames)
  }, [itemNames])
  const displayItemNames = itemNames.length > 0 ? itemNames : lastItemNames

  useEffect(() => {
    if (!isOpen) return
    setCategory(expenseCategories[0]?.name ?? '')
    setAmount('')
    setMemo(itemNames.join('・'))
    setDate(todayStr())
    setStoreType(initialStoreType ?? '')
    setPaymentType(loadDefaultPaymentType())
    setShowDetails(false)
    setStoreTypeOpen(false)
    setSubmitting(false)
    setError(null)
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

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
      <div className="space-y-4">
        <div className="bg-surface rounded-xl px-4 py-3">
          <p className="text-xs text-ink-muted mb-1">購入した商品</p>
          <ul className="space-y-0.5">
            {displayItemNames.map((itemName, i) => (
              <li key={i} className="text-sm text-ink">• {itemName}</li>
            ))}
          </ul>
        </div>

        <DatePicker label="購入日" value={date} onChange={setDate} />

        <div className="rounded-xl px-4 py-3 bg-danger-500">
          <label className="text-xs text-white/80 font-bold">合計金額</label>
          <div className="flex items-center gap-2 mt-1">
            <Input
              type="number"
              inputMode="numeric"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0"
              className="flex-1 bg-white border-white/30 text-ink"
            />
            <span className="text-base text-white font-medium">円</span>
          </div>
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
          <FormLabel>メモ（任意）</FormLabel>
          <Input type="text" value={memo} onChange={e => setMemo(e.target.value)} placeholder="例：スーパーで購入" />
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
            <div className="relative">
              <FormLabel>店舗種別（任意）</FormLabel>
              <button
                type="button"
                onClick={() => setStoreTypeOpen(v => !v)}
                className="w-full mt-1 flex items-center justify-between border border-line rounded-xl px-3 py-2 text-sm text-ink bg-surface"
              >
                <span className="flex items-center gap-2">
                  <span className="text-lg">{selectedStoreType?.icon ?? '🏷️'}</span>
                  <span>{selectedStoreType?.name ?? '未選択'}</span>
                </span>
                <span className="text-ink-muted text-xs">{storeTypeOpen ? '▲' : '▼'}</span>
              </button>
              {storeTypeOpen && (
                <>
                  <button
                    type="button"
                    aria-label="閉じる"
                    className="fixed inset-0 z-10 cursor-default"
                    onClick={() => setStoreTypeOpen(false)}
                  />
                  <div className="absolute top-full left-0 right-0 mt-1 bg-surface rounded-xl shadow-lg border border-line-subtle overflow-hidden z-20 max-h-64 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => { setStoreType(''); setStoreTypeOpen(false) }}
                      className={'w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left ' + (storeType === '' ? 'bg-primary-50 text-primary-700' : 'text-ink active:bg-surface-subtle')}
                    >
                      <span className="text-lg">🏷️</span>
                      <span>未選択</span>
                    </button>
                    {STORE_TYPES.map(s => (
                      <button
                        key={s.name}
                        type="button"
                        onClick={() => { setStoreType(s.name); setStoreTypeOpen(false) }}
                        className={'w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left ' + (storeType === s.name ? 'bg-primary-50 text-primary-700' : 'text-ink active:bg-surface-subtle')}
                      >
                        <span className="text-lg">{s.icon}</span>
                        <span>{s.name}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
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
      </div>
    </BottomSheet>
  )
}
