import { useEffect, useState } from 'react'
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
  } = useOneTimeForm({ userId, expenseCategories, incomeCategories, editingTx, onBack })

  const [storeTypeOpen, setStoreTypeOpen] = useState(false)
  const selectedStoreType = STORE_TYPES.find((s) => s.name === values.storeType)
  const { methods: paymentMethods } = usePaymentMethods()
  const paymentMethodsForType = paymentMethods.filter((m) => m.type === values.paymentType)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)

  function requestBack() {
    if (isDirty) {
      setShowDiscardConfirm(true)
    } else {
      onBack()
    }
  }

  // ヘッダーに戻るボタンを表示する。編集時は削除ボタンも表示する
  useEffect(() => {
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
          onConfirm={() => { setShowDiscardConfirm(false); onBack() }}
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
          <div className="relative bg-white rounded-2xl shadow-xl mx-6 p-6 flex flex-col items-center gap-4 w-full max-w-sm">
            <div className="text-3xl">✅</div>
            <p className="text-base font-semibold text-slate-700">記録しました！</p>
            <div className="flex flex-col gap-2 w-full">
              <button
                type="button"
                onClick={() => setShowSuccess(false)}
                className="w-full py-3 rounded-xl bg-emerald-500 text-white font-semibold active:bg-emerald-600"
              >
                続けて記録する
              </button>
              <button
                type="button"
                onClick={() => { setShowSuccess(false); onBack() }}
                className="w-full py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold active:bg-slate-50"
              >
                一覧を見る
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
        {/* 収支トグル */}
        <div className="flex rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => handleTypeChange('expense')}
            className={
              'flex-1 py-2 rounded-lg text-sm font-semibold transition ' +
              (values.type === 'expense' ? 'bg-rose-500 text-white shadow' : 'text-slate-500')
            }
          >
            支出
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('income')}
            className={
              'flex-1 py-2 rounded-lg text-sm font-semibold transition ' +
              (values.type === 'income' ? 'bg-emerald-500 text-white shadow' : 'text-slate-500')
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
          <label className="text-xs text-slate-400">カテゴリ</label>
          <div className="grid grid-cols-5 gap-2 mt-1">
            {formCategories.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => selectCategory(c.name)}
                className={
                  'flex flex-col items-center justify-center py-2 rounded-xl text-xs gap-1 border ' +
                  (values.category === c.name
                    ? 'border-emerald-400 bg-emerald-50'
                    : 'border-slate-100 bg-slate-50')
                }
              >
                <span className="text-lg">{c.icon}</span>
                <span className="text-[10px] leading-tight text-slate-600 text-center">
                  {c.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 食事タイプ（食費カテゴリ選択時のみ） */}
        {values.type === 'expense' && values.category === '食費' && (
          <div>
            <label className="text-xs text-slate-400">食事タイプ（任意）</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {MEAL_TYPES.map((m) => (
                <button
                  key={m.name}
                  type="button"
                  onClick={() => setValue('mealType', values.mealType === m.name ? '' : m.name)}
                  className={
                    'flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs border ' +
                    (values.mealType === m.name
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                      : 'border-slate-100 bg-slate-50 text-slate-600')
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
          <label className="text-xs text-slate-400">金額</label>
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
              className={`flex-1 border rounded-xl px-3 py-2 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-300 ${amountError ? 'border-rose-300' : 'border-slate-200'}`}
            />
            <span className="text-sm text-slate-500 font-medium">円</span>
          </div>
          {amountError && <p className="text-xs text-rose-500 mt-1">{amountError}</p>}
        </div>

        {/* 店舗種別 */}
        {values.type === 'expense' && (
          <div className="relative">
            <label className="text-xs text-slate-400">店舗種別（任意）</label>
            <button
              type="button"
              onClick={() => setStoreTypeOpen((v) => !v)}
              className="w-full mt-1 flex items-center justify-between border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 bg-white"
            >
              <span className="flex items-center gap-2">
                <span className="text-lg">{selectedStoreType?.icon ?? '🏷️'}</span>
                <span>{selectedStoreType?.name ?? '未選択'}</span>
              </span>
              <span className="text-slate-400 text-xs">{storeTypeOpen ? '▲' : '▼'}</span>
            </button>

            {storeTypeOpen && (
              <>
                <button
                  type="button"
                  aria-label="閉じる"
                  className="fixed inset-0 z-10 cursor-default"
                  onClick={() => setStoreTypeOpen(false)}
                />
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden z-20 max-h-64 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => { setValue('storeType', ''); setStoreTypeOpen(false) }}
                    className={
                      'w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left ' +
                      (values.storeType === '' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 active:bg-slate-50')
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
                        (values.storeType === s.name ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 active:bg-slate-50')
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
            <label className="text-xs text-slate-400">支払い方法（任意）</label>
            <div className="grid grid-cols-4 gap-1.5 mt-1">
              {PAYMENT_TYPES.map((p) => (
                <button
                  key={p.type}
                  type="button"
                  onClick={() => selectPaymentType(p.type)}
                  className={
                    'flex flex-col items-center justify-center py-2 rounded-xl text-xs gap-1 border-2 transition ' +
                    (values.paymentType === p.type
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-transparent bg-slate-100')
                  }
                >
                  <span className="text-lg">{p.icon}</span>
                  <span className="text-[10px] leading-tight text-slate-600 text-center">
                    {p.name}
                  </span>
                </button>
              ))}
            </div>

            {values.paymentType && values.paymentType !== 'cash' && (
              <div className="mt-2 pl-3 border-l-2 border-emerald-200 space-y-1.5">
                <div className="text-[11px] text-slate-400">利用サービスを選択（任意）</div>
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
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : 'border-slate-200 bg-white text-slate-600')
                        }
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">
                    設定 &gt; 支払い方法 からサービスを登録できます
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* メモ */}
        <div>
          <label className="text-xs text-slate-400">メモ（任意）</label>
          <input
            type="text"
            placeholder="例: スーパーで買い物"
            value={values.memo}
            onChange={(e) => setValue('memo', e.target.value)}
            className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
        </div>

        {error && <p className="text-xs text-rose-500">{error}</p>}
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
              ? 'bg-rose-500 active:bg-rose-600'
              : 'bg-emerald-500 active:bg-emerald-600')
          }
        >
          {isSubmitting ? (editingTx ? '更新中...' : '記録中...') : (editingTx ? '更新する' : '記録する')}
        </button>
      </div>
    </>
  )
}
