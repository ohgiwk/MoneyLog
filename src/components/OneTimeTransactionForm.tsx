import { useEffect, useRef, useState } from 'react'
import { MEAL_TYPES, PAYMENT_TYPES, STORE_TYPES, type CategoryInfo } from '../constants'
import type { Transaction } from '../lib/database.types'
import { useOneTimeForm } from '../hooks/useOneTimeForm'
import { usePaymentMethods } from '../hooks/usePaymentMethods'
import DatePicker from './ui/DatePicker'
import ConfirmDialog from './ui/ConfirmDialog'
import Modal from './ui/Modal'
import { TIPS } from './SavingTipsScreen'
import Button from './ui/Button'
import Input from './ui/Input'
import ErrorText from './ui/ErrorText'

interface Props {
  userId: string
  expenseCategories: CategoryInfo[]
  incomeCategories: CategoryInfo[]
  editingTx?: Transaction | null
  duplicateTx?: Transaction | null
  onBack: () => void
  onTypeChange?: (type: 'expense' | 'income') => void
  onHeaderChange?: (
    state: {
      title: string
      onBack: () => void
      action?: { label: string; onClick: () => void; disabled?: boolean; tone?: 'default' | 'danger' }
    } | null
  ) => void
  submitRef?: React.MutableRefObject<(() => void) | null>
}

export default function OneTimeTransactionForm({
  userId,
  expenseCategories,
  incomeCategories,
  editingTx,
  duplicateTx,
  onBack,
  onTypeChange,
  onHeaderChange,
  submitRef,
}: Props) {
  // 画面遷移アニメーション中もこのコンポーネントは一瞬マウントされたままになるため、
  // 閉じることが決まった後にヘッダー登録エフェクトが再実行されてタイトルが復活しないよう防ぐ
  const closedRef = useRef(false)
  const amountRef = useRef<HTMLInputElement>(null)
  const [successTip, setSuccessTip] = useState('')

  function closeAndNotify() {
    closedRef.current = true
    onBack()
  }

  const {
    values,
    setValue,
    formCategories,
    isSubmitting,
    isDirty,
    error,
    showSuccess,
    setShowSuccess,
    amountError,
    setAmountError,
    confirmDelete,
    setConfirmDelete,
    handleTypeChange,
    selectCategory,
    selectPaymentType,
    handleSubmit,
    handleDelete,
  } = useOneTimeForm({ userId, expenseCategories, incomeCategories, editingTx, duplicateTx, onBack: closeAndNotify })

  if (submitRef) submitRef.current = () => { void handleSubmit() }

  const [storeTypeOpen, setStoreTypeOpen] = useState(false)
  const [storeTypeDropUp, setStoreTypeDropUp] = useState(false)
  const storeTypeButtonRef = useRef<HTMLButtonElement>(null)
  const selectedStoreType = STORE_TYPES.find((s) => s.name === values.storeType)
  const { methods: paymentMethods } = usePaymentMethods()
  const paymentMethodsForType = paymentMethods.filter((m) => m.type === values.paymentType)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)

  function requestBack() {
    if (isDirty) {
      setShowDiscardConfirm(true)
    } else {
      closeAndNotify()
    }
  }

  useEffect(() => {
    if (showSuccess) setSuccessTip(TIPS[Math.floor(Math.random() * TIPS.length)])
  }, [showSuccess])

  // ページ遷移アニメーション(320ms)完了後にフォーカスしてキーボードを表示
  useEffect(() => {
    const id = setTimeout(() => amountRef.current?.focus(), 350)
    return () => clearTimeout(id)
  }, [])

  // ヘッダーに戻るボタンを表示する。編集時は削除ボタンも表示する
  useEffect(() => {
    if (closedRef.current) return
    onHeaderChange?.({
      title: editingTx ? '記録を編集' : '出費を記録',
      onBack: requestBack,
      action: editingTx
        ? { label: '削除', onClick: () => setConfirmDelete(true), disabled: isSubmitting, tone: 'danger' }
        : undefined,
    })
  }, [editingTx, isDirty, isSubmitting]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {showDiscardConfirm && (
        <ConfirmDialog
          message="入力内容を破棄しますか？"
          confirmLabel="破棄する"
          onConfirm={() => { setShowDiscardConfirm(false); closeAndNotify() }}
          onCancel={() => setShowDiscardConfirm(false)}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          message="この記録を削除しますか？"
          confirmLabel="削除する"
          onConfirm={() => { setConfirmDelete(false); handleDelete() }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      <Modal isOpen={showSuccess} onClose={() => setShowSuccess(false)}>
        <div className="p-6 flex flex-col items-center gap-4">
          <div className="text-3xl">✅</div>
          <p className="text-base font-semibold text-ink">記録しました！</p>
          {successTip && (
            <>
              <div className="w-full border-t border-line-subtle" />
              <div className="w-full bg-primary-50 rounded-xl px-4 py-3">
                <p className="text-sm text-primary-600 font-semibold mb-2">💡 節約のコツ</p>
                <p className="text-sm text-primary-800 leading-relaxed">{successTip}</p>
              </div>
            </>
          )}
          <div className="flex flex-col gap-2 w-full">
            <Button fullWidth type="button" onClick={() => setShowSuccess(false)}>
              続けて記録する
            </Button>
            <Button fullWidth variant="secondary" type="button" onClick={() => { setShowSuccess(false); closeAndNotify() }}>
              一覧を見る
            </Button>
          </div>
        </div>
      </Modal>

      <form onSubmit={handleSubmit} className="bg-surface rounded-2xl p-4 shadow-sm space-y-3">
        {/* 収支トグル */}
        <div className="flex rounded-xl bg-surface-hover p-1">
          <button
            type="button"
            onClick={() => { handleTypeChange('expense'); onTypeChange?.('expense') }}
            className={
              'flex-1 py-2 rounded-lg text-sm font-semibold transition ' +
              (values.type === 'expense' ? 'bg-danger-500 text-white shadow' : 'text-ink-muted')
            }
          >
            支出
          </button>
          <button
            type="button"
            onClick={() => { handleTypeChange('income'); onTypeChange?.('income') }}
            className={
              'flex-1 py-2 rounded-lg text-sm font-semibold transition ' +
              (values.type === 'income' ? 'bg-income-500 text-white shadow' : 'text-ink-muted')
            }
          >
            収入
          </button>
        </div>

        {/* 日付 */}
        <div>
          <DatePicker label="日付" value={values.date} onChange={(v) => setValue('date', v)} />
        </div>

        {/* 金額 */}
        <div className={`rounded-xl px-4 py-3 ${values.type === 'expense' ? 'bg-danger-500' : 'bg-income-500'}`}>
          <label className="text-xs text-white/80 font-bold">金額</label>
          <div className="flex items-center gap-2 mt-1">
            <Input
              ref={amountRef}
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={values.amount}
              onChange={(e) => {
                setValue('amount', e.target.value)
                if (amountError) setAmountError(null)
              }}
              error={!!amountError}
              className="flex-1 text-2xl font-bold"
            />
            <span className="text-base text-white font-medium">円</span>
          </div>
        </div>
        <ErrorText className="px-4">{amountError}</ErrorText>

        {/* カテゴリ */}
        <div>
          <label className="text-xs text-ink-muted">カテゴリ</label>
          <div className="grid grid-cols-5 gap-2 mt-1">
            {formCategories.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => selectCategory(c.name)}
                className={
                  'flex flex-col items-center justify-center py-2 rounded-xl text-xs gap-1 border ' +
                  (values.category === c.name
                    ? 'border-primary-400 bg-primary-50 dark:bg-primary-950/60'
                    : 'border-line-subtle bg-surface-subtle')
                }
              >
                <span className="text-lg">{c.icon}</span>
                <span className="text-[10px] leading-tight text-ink text-center">
                  {c.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 食事タイプ（食費カテゴリ選択時のみ） */}
        {values.type === 'expense' && values.category === '食費' && (
          <div>
            <label className="text-xs text-ink-muted">食事タイプ（任意）</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {MEAL_TYPES.map((m) => (
                <button
                  key={m.name}
                  type="button"
                  onClick={() => setValue('mealType', values.mealType === m.name ? '' : m.name)}
                  className={
                    'flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs border ' +
                    (values.mealType === m.name
                      ? 'border-primary-400 bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-400'
                      : 'border-line-subtle bg-surface-subtle text-ink')
                  }
                >
                  <span>{m.icon}</span>
                  <span>{m.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 店舗種別 */}
        {values.type === 'expense' && (
          <div className="relative">
            <label className="text-xs text-ink-muted">店舗種別（任意）</label>
            <button
              ref={storeTypeButtonRef}
              type="button"
              onClick={() => {
                if (!storeTypeOpen && storeTypeButtonRef.current) {
                  const rect = storeTypeButtonRef.current.getBoundingClientRect()
                  const spaceBelow = window.innerHeight - rect.bottom
                  setStoreTypeDropUp(spaceBelow < 280)
                }
                setStoreTypeOpen((v) => !v)
              }}
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
                <div className={`absolute left-0 right-0 bg-surface rounded-xl shadow-lg border border-line-subtle overflow-hidden z-20 max-h-64 overflow-y-auto ${storeTypeDropUp ? 'bottom-full' : 'top-full mt-1'}`}>
                  <button
                    type="button"
                    onClick={() => { setValue('storeType', ''); setStoreTypeOpen(false) }}
                    className={
                      'w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left ' +
                      (values.storeType === '' ? 'bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-400' : 'text-ink active:bg-surface-subtle')
                    }
                  >
                    <span className="text-lg">🏷️</span>
                    <span>未選択</span>
                  </button>
                  {STORE_TYPES.map((s) => (
                    <button
                      key={s.name}
                      type="button"
                      onClick={() => { setValue('storeType', s.name); setStoreTypeOpen(false) }}
                      className={
                        'w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left ' +
                        (values.storeType === s.name ? 'bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-400' : 'text-ink active:bg-surface-subtle')
                      }
                    >
                      <span className="text-lg">{s.icon}</span>
                      <span>{s.name}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* 支払い方法 */}
        {values.type === 'expense' && (
          <div>
            <label className="text-xs text-ink-muted">支払い方法（任意）</label>
            <div className="grid grid-cols-4 gap-1.5 mt-1">
              {PAYMENT_TYPES.map((p) => (
                <button
                  key={p.type}
                  type="button"
                  onClick={() => selectPaymentType(p.type)}
                  className={
                    'flex flex-col items-center justify-center py-2 rounded-xl text-xs gap-1 border-2 transition ' +
                    (values.paymentType === p.type
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/60'
                      : 'border-transparent bg-surface-hover')
                  }
                >
                  <span className="text-lg">{p.icon}</span>
                  <span className="text-[10px] leading-tight text-ink text-center">
                    {p.name}
                  </span>
                </button>
              ))}
            </div>

            {values.paymentType && values.paymentType !== 'cash' && (
              <div className="mt-2 pl-3 border-l-2 border-primary-200 space-y-1.5">
                <div className="text-[11px] text-ink-muted">利用サービスを選択（任意）</div>
                {paymentMethodsForType.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {paymentMethodsForType.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setValue('paymentMethod', values.paymentMethod === m.name ? '' : m.name)}
                        className={
                          'px-3 py-1 rounded-lg text-xs font-medium border ' +
                          (values.paymentMethod === m.name
                            ? 'border-primary-500 bg-primary-500 text-white'
                            : 'border-line bg-surface text-ink')
                        }
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-ink-muted">
                    設定 &gt; 支払い方法 からサービスを登録できます
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* メモ */}
        <div>
          <label className="text-xs text-ink-muted">メモ（任意）</label>
          <Input
            type="text"
            placeholder={values.type === 'income' ? '例: 7月分給与' : '例: スーパーで買い物'}
            value={values.memo}
            onChange={(e) => setValue('memo', e.target.value)}
            className="mt-1"
          />
        </div>

        <ErrorText>{error}</ErrorText>
      </form>
    </>
  )
}
