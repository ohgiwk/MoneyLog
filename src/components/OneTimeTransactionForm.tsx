import type { CategoryInfo } from '../constants'
import type { Transaction } from '../lib/database.types'
import { useOneTimeForm } from '../hooks/useOneTimeForm'
import DatePicker from './ui/DatePicker'
import ConfirmDialog from './ui/ConfirmDialog'

interface Props {
  userId: string
  expenseCategories: CategoryInfo[]
  incomeCategories: CategoryInfo[]
  editingTx?: Transaction | null
  onBack: () => void
}

export default function OneTimeTransactionForm({
  userId,
  expenseCategories,
  incomeCategories,
  editingTx,
  onBack,
}: Props) {
  const {
    values,
    setValue,
    formCategories,
    isSubmitting,
    error,
    showSuccess,
    setShowSuccess,
    amountError,
    setAmountError,
    confirmDelete,
    setConfirmDelete,
    handleTypeChange,
    handleSubmit,
    handleDelete,
    resetForm,
  } = useOneTimeForm({ userId, expenseCategories, incomeCategories, editingTx, onBack })

  return (
    <>
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

      {/* ヘッダー */}
      <div className="flex items-center gap-3 mb-4">
        <button
          type="button"
          onClick={() => { resetForm(); onBack() }}
          className="text-slate-500 active:text-slate-700 text-lg px-1"
          aria-label="戻る"
        >
          ←
        </button>
        <span className="font-semibold text-slate-800">
          {editingTx ? '記録を編集' : '臨時出費を記録'}
        </span>
      </div>

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
                onClick={() => setValue('category', c.name)}
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

        <button
          type="submit"
          disabled={isSubmitting}
          className={
            'w-full py-3 rounded-xl text-white font-semibold shadow disabled:opacity-50 ' +
            (values.type === 'expense'
              ? 'bg-rose-500 active:bg-rose-600'
              : 'bg-emerald-500 active:bg-emerald-600')
          }
        >
          {isSubmitting ? (editingTx ? '更新中...' : '記録中...') : (editingTx ? '更新する' : '記録する')}
        </button>

        {editingTx && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={isSubmitting}
              className="w-[30%] py-3 rounded-xl text-rose-500 font-semibold border border-rose-200 active:bg-rose-50 disabled:opacity-50"
            >
              削除
            </button>
            <button
              type="button"
              onClick={() => { resetForm(); onBack() }}
              disabled={isSubmitting}
              className="w-[70%] py-3 rounded-xl text-slate-500 font-semibold border border-slate-200 active:bg-slate-50 disabled:opacity-50"
            >
              キャンセル
            </button>
          </div>
        )}
      </form>
    </>
  )
}
