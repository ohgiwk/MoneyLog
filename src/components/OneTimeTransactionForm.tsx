import { useEffect, useRef, useState } from 'react'
import { MEAL_TYPES, PAYMENT_TYPES, STORE_TYPES, type CategoryInfo } from '../constants'
import type { Transaction } from '../lib/database.types'
import { useOneTimeForm } from '../hooks/useOneTimeForm'
import { usePaymentMethods } from '../hooks/usePaymentMethods'
import DatePicker from './ui/DatePicker'
import ConfirmDialog from './ui/ConfirmDialog'

interface Props {
  userId: string
  expenseCategories: CategoryInfo[]
  incomeCategories: CategoryInfo[]
  editingTx?: Transaction | null
  onBack: () => void
  onHeaderChange?: (
    state: {
      title: string
      onBack: () => void
      action?: { label: string; onClick: () => void; disabled?: boolean; tone?: 'default' | 'danger' }
    } | null
  ) => void
}

export default function OneTimeTransactionForm({
  userId,
  expenseCategories,
  incomeCategories,
  editingTx,
  onBack,
  onHeaderChange,
}: Props) {
  // 画面遷移アニメーション中もこのコンポーネントは一瞬マウントされたままになるため、
  // 閉じることが決まった後にヘッダー登録エフェクトが再実行されてタイトルが復活しないよう防ぐ
  const closedRef = useRef(false)
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
  } = useOneTimeForm({ userId, expenseCategories, incomeCategories, editingTx, onBack: closeAndNotify })

  const [storeTypeOpen, setStoreTypeOpen] = useState(false)
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

      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowSuccess(false)} />
          <div className="relative bg-surface rounded-2xl shadow-xl mx-6 p-6 flex flex-col items-center gap-4 w-full max-w-sm">
            <div className="text-3xl">✅</div>
            <p className="text-base font-semibold text-ink">記録しました！</p>
            <div className="flex flex-col gap-2 w-full">
              <button
                type="button"
                onClick={() => setShowSuccess(false)}
                className="w-full py-3 rounded-xl bg-primary-500 text-white font-semibold active:bg-primary-600"
              >
                続けて記録する
              </button>
              <button
                type="button"
                onClick={() => { setShowSuccess(false); closeAndNotify() }}
                className="w-full py-3 rounded-xl border border-line text-ink font-semibold active:bg-surface-subtle"
              >
                一覧を見る
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-surface rounded-2xl p-4 shadow-sm space-y-3">
        {/* 収支トグル */}
        <div className="flex rounded-xl bg-surface-hover p-1">
          <button
            type="button"
            onClick={() => handleTypeChange('expense')}
            className={
              'flex-1 py-2 rounded-lg text-sm font-semibold transition ' +
              (values.type === 'expense' ? 'bg-danger-500 text-white shadow' : 'text-ink-muted')
            }
          >
            支出
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('income')}
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

        {/* 金額 */}
        <div>
          <label className="text-xs text-ink-muted">金額</label>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={values.amount}
              onChange={(e) => {
                setValue('amount', e.target.value)
                if (amountError) setAmountError(null)
              }}
              className={`flex-1 border rounded-xl px-3 py-2 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary-300 ${amountError ? 'border-danger-300' : 'border-line'}`}
            />
            <span className="text-sm text-ink-muted font-medium">円</span>
          </div>
          {amountError && <p className="text-xs text-danger-500 mt-1">{amountError}</p>}
        </div>

        {/* 店舗種別 */}
        {values.type === 'expense' && (
          <div className="relative">
            <label className="text-xs text-ink-muted">店舗種別（任意）</label>
            <button
              type="button"
              onClick={() => setStoreTypeOpen((v) => !v)}
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
          <input
            type="text"
            placeholder="例: スーパーで買い物"
            value={values.memo}
            onChange={(e) => setValue('memo', e.target.value)}
            className="w-full mt-1 border border-line rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
        </div>

        {error && <p className="text-xs text-danger-500">{error}</p>}
      </form>

      {/* 保存ボタン（タブメニュー上にフローティング表示） */}
      <div className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] left-0 right-0 max-w-md mx-auto px-4 z-20 flex justify-center">
        <button
          type="button"
          onClick={() => handleSubmit()}
          disabled={isSubmitting}
          className={
            'w-[60%] py-3.5 rounded-[2rem] text-white font-semibold text-sm shadow-lg disabled:opacity-50 ' +
            (values.type === 'expense'
              ? 'bg-danger-500 active:bg-danger-600'
              : 'bg-primary-500 active:bg-primary-600')
          }
        >
          {isSubmitting ? (editingTx ? '更新中...' : '記録中...') : (editingTx ? '更新する' : '記録する')}
        </button>
      </div>
    </>
  )
}
