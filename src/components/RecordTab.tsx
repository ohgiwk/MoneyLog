import { useEffect, useState, type FormEvent } from 'react'
import type { CategoryInfo } from '../constants'
import { transactionService } from '../lib/services/transactionService'
import { todayStr } from '../utils'

interface Props {
  userId: string
  expenseCategories: CategoryInfo[]
  incomeCategories: CategoryInfo[]
}

export default function RecordTab({ userId, expenseCategories, incomeCategories }: Props) {
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [date, setDate] = useState(todayStr())
  const [category, setCategory] = useState(expenseCategories[0]?.name ?? '')
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const categories = type === 'expense' ? expenseCategories : incomeCategories

  useEffect(() => {
    setCategory(categories[0]?.name ?? '')
  }, [type, expenseCategories, incomeCategories])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return
    setSubmitting(true)
    await transactionService.insert({
      user_id: userId,
      type,
      expense_kind: type === 'expense' ? 'one_time' : null,
      date,
      category,
      amount: amt,
      memo: memo.trim() || null,
      recurring_rule_id: null,
    })
    setAmount('')
    setMemo('')
    setSubmitting(false)
  }

  return (
    <div>
      <div className="p-4 space-y-4">
        {/* 入力フォーム */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          {/* 収支トグル */}
          <div className="flex rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={
                'flex-1 py-2 rounded-lg text-sm font-semibold transition ' +
                (type === 'expense' ? 'bg-rose-500 text-white shadow' : 'text-slate-500')
              }
            >
              支出
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={
                'flex-1 py-2 rounded-lg text-sm font-semibold transition ' +
                (type === 'income' ? 'bg-emerald-500 text-white shadow' : 'text-slate-500')
              }
            >
              収入
            </button>
          </div>

          {/* 日付 */}
          <div>
            <label className="text-xs text-slate-400">日付</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>

          {/* カテゴリ */}
          <div>
            <label className="text-xs text-slate-400">カテゴリ</label>
            <div className="grid grid-cols-5 gap-2 mt-1">
              {categories.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setCategory(c.name)}
                  className={
                    'flex flex-col items-center justify-center py-2 rounded-xl text-xs gap-1 border ' +
                    (category === c.name
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
            <input
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>

          {/* メモ */}
          <div>
            <label className="text-xs text-slate-400">メモ（任意）</label>
            <input
              type="text"
              placeholder="例: スーパーで買い物"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className={
              'w-full py-3 rounded-xl text-white font-semibold shadow disabled:opacity-50 ' +
              (type === 'expense'
                ? 'bg-rose-500 active:bg-rose-600'
                : 'bg-emerald-500 active:bg-emerald-600')
            }
          >
            記録する
          </button>
        </form>
      </div>
    </div>
  )
}
