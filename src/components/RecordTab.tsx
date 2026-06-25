import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../constants'
import { supabase } from '../lib/supabase'
import type { Transaction } from '../lib/database.types'
import { categoryInfo, formatYen, monthKey, monthLabel, todayStr } from '../utils'
import MonthSwitcher from './ui/MonthSwitcher'

interface Props {
  userId: string
  month: string
  setMonth: (m: string) => void
}

export default function RecordTab({ userId, month, setMonth }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [expenseKind, setExpenseKind] = useState<'routine' | 'one_time'>('routine')
  const [date, setDate] = useState(todayStr())
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0].name)
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES

  useEffect(() => {
    setCategory(categories[0].name)
  }, [type])

  useEffect(() => {
    fetchTransactions()
  }, [month])

  async function fetchTransactions() {
    const from = `${month}-01`
    const to = `${month}-31`
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: false })
    setTransactions(data ?? [])
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return
    setSubmitting(true)
    await supabase.from('transactions').insert({
      user_id: userId,
      type,
      expense_kind: type === 'expense' ? expenseKind : null,
      date,
      category,
      amount: amt,
      memo: memo.trim() || null,
      recurring_rule_id: null,
    })
    setAmount('')
    setMemo('')
    await fetchTransactions()
    setSubmitting(false)
  }

  async function deleteTx(id: string) {
    await supabase.from('transactions').delete().eq('id', id)
    setTransactions((prev) => prev.filter((t) => t.id !== id))
  }

  const monthTx = useMemo(
    () => transactions.filter((t) => monthKey(t.date) === month),
    [transactions, month]
  )

  // 日付でグループ化
  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    for (const t of monthTx) {
      const arr = map.get(t.date) ?? []
      arr.push(t)
      map.set(t.date, arr)
    }
    return [...map.entries()].sort(([a], [b]) => (a < b ? 1 : -1))
  }, [monthTx])

  return (
    <div>
      <MonthSwitcher month={month} setMonth={setMonth} />
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

          {/* 支出種別 */}
          {type === 'expense' && (
            <div className="flex rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setExpenseKind('routine')}
                className={
                  'flex-1 py-1.5 rounded-lg text-xs font-semibold transition ' +
                  (expenseKind === 'routine' ? 'bg-white shadow text-slate-700' : 'text-slate-400')
                }
              >
                ルーチン費
              </button>
              <button
                type="button"
                onClick={() => setExpenseKind('one_time')}
                className={
                  'flex-1 py-1.5 rounded-lg text-xs font-semibold transition ' +
                  (expenseKind === 'one_time' ? 'bg-white shadow text-slate-700' : 'text-slate-400')
                }
              >
                臨時費
              </button>
            </div>
          )}

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

        {/* 記録一覧 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="text-sm font-semibold text-slate-700 mb-3">{monthLabel(month)}の記録</div>
          {grouped.length === 0 && (
            <div className="text-sm text-slate-400 py-2">記録がありません</div>
          )}
          <div className="space-y-4">
            {grouped.map(([date, txs]) => {
              const dayExpense = txs
                .filter((t) => t.type === 'expense')
                .reduce((s, t) => s + t.amount, 0)
              return (
                <div key={date}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-slate-500">{date}</span>
                    {dayExpense > 0 && (
                      <span className="text-xs text-rose-400">{formatYen(dayExpense)}</span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {txs.map((t) => {
                      const info = categoryInfo(t.category)
                      return (
                        <div
                          key={t.id}
                          className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-base">{info.icon}</span>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm text-slate-700">{t.category}</span>
                                {t.expense_kind === 'one_time' && (
                                  <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full">
                                    臨時
                                  </span>
                                )}
                              </div>
                              {t.memo && <div className="text-xs text-slate-400">{t.memo}</div>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={
                                'text-sm font-semibold ' +
                                (t.type === 'income' ? 'text-emerald-600' : 'text-rose-500')
                              }
                            >
                              {t.type === 'income' ? '+' : '-'}
                              {formatYen(t.amount)}
                            </span>
                            <button
                              onClick={() => deleteTx(t.id)}
                              className="text-slate-200 active:text-rose-400 text-sm px-1"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
