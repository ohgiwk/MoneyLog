import { useEffect, useRef, useState, type MutableRefObject } from 'react'
import { useAppContext } from '../contexts/AppContext'
import { useStoreTypes } from '../hooks/useStoreTypes'
import { usePaymentMethods } from '../hooks/usePaymentMethods'
import type { PinnedItemDraft } from '../hooks/usePinnedItems'
import { PAYMENT_TYPES } from '../constants'
import BottomSheet from './ui/BottomSheet'
import CategoryGrid from './ui/CategoryGrid'
import ErrorText from './ui/ErrorText'
import FormLabel from './ui/FormLabel'
import Input from './ui/Input'

interface Props {
  isOpen: boolean
  // null のときは新規作成
  initial: PinnedItemDraft | null
  onSave: (draft: PinnedItemDraft) => void
  onClose: () => void
  // 編集時のみ、ヘッダーに削除ボタンを出す
  onDelete?: () => void
}

export default function PinnedItemSheet({ isOpen, initial, onSave, onClose, onDelete }: Props) {
  const submitRef = useRef<(() => void) | null>(null)

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={initial ? 'ピン留めを編集' : 'ピン留めを追加'}
      rightAction={initial && onDelete ? { onClick: onDelete, tone: 'danger' } : undefined}
      footer={
        <button
          type="button"
          onClick={() => submitRef.current?.()}
          className="w-full py-3.5 text-base rounded-[2rem] shadow-lg text-white font-semibold bg-primary-500 active:bg-primary-600"
        >
          保存
        </button>
      }
    >
      <PinnedItemFields initial={initial} onSave={onSave} submitRef={submitRef} />
    </BottomSheet>
  )
}

function PinnedItemFields({
  initial,
  onSave,
  submitRef,
}: {
  initial: PinnedItemDraft | null
  onSave: (draft: PinnedItemDraft) => void
  submitRef: MutableRefObject<(() => void) | null>
}) {
  const { categories } = useAppContext()
  const expenseCategories = categories.activeExpenseCategories
  const { items: storeTypes } = useStoreTypes()
  const { methods: paymentMethods } = usePaymentMethods()

  const [name, setName] = useState(initial?.name ?? '')
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '')
  const [memo, setMemo] = useState(initial?.memo ?? '')
  const [category, setCategory] = useState(initial?.category ?? expenseCategories[0]?.name ?? '')
  const [storeType, setStoreType] = useState(initial?.store_type ?? '')
  const [paymentType, setPaymentType] = useState(initial?.payment_type ?? '')
  const [paymentMethod, setPaymentMethod] = useState(initial?.payment_method ?? '')
  const [error, setError] = useState<string | null>(null)

  const methodsForType = paymentMethods.filter((m) => m.type === paymentType)
  // 設定から削除済みの店舗種別が保存されている場合も、選択肢に残して値を失わないようにする
  const storeOptions =
    storeType && !storeTypes.some((s) => s.name === storeType)
      ? [...storeTypes, { id: storeType, name: storeType, icon: '🏷️' }]
      : storeTypes

  function handleSave() {
    const amountNum = Number(amount)
    if (!Number.isInteger(amountNum) || amountNum <= 0) {
      setError('金額を1円以上の整数で入力してください')
      return
    }
    if (!category) {
      setError('カテゴリを選択してください')
      return
    }
    onSave({
      name: name.trim() || null,
      category,
      amount: amountNum,
      memo: memo.trim() || null,
      store_type: storeType || null,
      // 食事タイプは食費のときだけ意味を持つので、カテゴリを変えたら引き継がない
      meal_type: category === '食費' && category === initial?.category ? initial.meal_type : null,
      payment_type: paymentType || null,
      payment_method: paymentType && paymentType !== 'cash' ? paymentMethod || null : null,
    })
  }

  // フッターの保存ボタン（シート側）から、常に最新の入力内容で保存できるようにする
  useEffect(() => {
    submitRef.current = handleSave
  })

  return (
    <div className="bg-surface rounded-2xl shadow-sm p-4 flex flex-col gap-3">
      <div>
        <FormLabel>表示名（任意）</FormLabel>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: いつもの昼食"
        />
      </div>

      <div>
        <FormLabel required>金額</FormLabel>
        <Input
          type="number"
          inputMode="numeric"
          min={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          aria-label="金額"
        />
      </div>

      <div>
        <FormLabel>メモ（任意）</FormLabel>
        <Input value={memo} onChange={(e) => setMemo(e.target.value)} aria-label="メモ" />
      </div>

      <div>
        <FormLabel required>カテゴリ</FormLabel>
        <CategoryGrid categories={expenseCategories} selected={category} onSelect={setCategory} />
      </div>

      <div>
        <FormLabel>店舗種別（任意）</FormLabel>
        <select
          value={storeType}
          onChange={(e) => setStoreType(e.target.value)}
          aria-label="店舗種別"
          className="w-full bg-surface border border-line rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
        >
          <option value="">未選択</option>
          {storeOptions.map((s) => (
            <option key={s.id} value={s.name}>
              {s.icon} {s.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <FormLabel>支払い方法（任意）</FormLabel>
        <div className="grid grid-cols-4 gap-1.5">
          {PAYMENT_TYPES.map((p) => (
            <button
              key={p.type}
              type="button"
              aria-pressed={paymentType === p.type}
              onClick={() => {
                // もう一度押すと未選択に戻す。種別が変わったら利用サービスは選び直す
                setPaymentType(paymentType === p.type ? '' : p.type)
                setPaymentMethod('')
              }}
              className={
                'flex flex-col items-center justify-center py-2 rounded-xl text-xs gap-1 border-2 transition ' +
                (paymentType === p.type
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/60'
                  : 'border-transparent bg-surface-hover')
              }
            >
              <span className="text-lg">{p.icon}</span>
              <span className="text-[10px] leading-tight text-ink text-center">{p.name}</span>
            </button>
          ))}
        </div>
        {methodsForType.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {methodsForType.map((m) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={paymentMethod === m.name}
                onClick={() => setPaymentMethod(paymentMethod === m.name ? '' : m.name)}
                className={
                  'px-3 py-1 rounded-lg text-xs font-medium border ' +
                  (paymentMethod === m.name
                    ? 'border-primary-500 bg-primary-500 text-white'
                    : 'border-line bg-surface text-ink')
                }
              >
                {m.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <ErrorText>{error}</ErrorText>
    </div>
  )
}
