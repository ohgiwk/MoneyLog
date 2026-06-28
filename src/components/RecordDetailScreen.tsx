import { useEffect, useMemo, useState } from 'react'
import { transactionService } from '../lib/services/transactionService'
import type { Transaction } from '../lib/database.types'
import { categoryInfo, formatYen, monthKey } from '../utils'
import MonthSwitcher from './ui/MonthSwitcher'

interface Props {
  userId: string
  month: string
  setMonth: (m: string) => void
  onBack: () => void
  onEditTx?: (tx: Transaction) => void
}

export default function RecordDetailScreen({ userId, month, setMonth, onBack, onEditTx }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => { window.scrollTo(0, 0) }, [])

  useEffect(() => {
    const load = async () => {
      setFetchError(null)
      try {
        const txs = await transactionService.fetchByMonth(userId, month)
        setTransactions(txs)
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : 'データの読み込みに失敗しました')
      }
    }
    void load()
  }, [userId, month])

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col">
      {/* ヘッダー */}
      <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-slate-500 active:text-slate-700 text-lg px-1"
          aria-label="戻る"
        >
          ←
        </button>
        <span className="font-semibold text-slate-800 flex-1">記録詳細</span>
      </div>

      <MonthSwitcher month={month} setMonth={setMonth} />

      {fetchError && (
        <div className="mx-4 mt-3 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-600">
          {fetchError}
        </div>
      )}

      <div className="p-4">
        <DetailView transactions={transactions} month={month} onEditTx={onEditTx} />
      </div>
    </div>
  )
}

function DetailView({
  transactions,
  month,
  onEditTx,
}: {
  transactions: Transaction[]
  month: string
  onEditTx?: (tx: Transaction) => void
}) {
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const isFiltered = typeFilter !== 'all' || categoryFilter !== 'all'

  const monthTx = useMemo(
    () => transactions.filter((t) => monthKey(t.date) === month),
    [transactions, month]
  )

  const categories = useMemo(() => {
    const set = new Set(monthTx.map((t) => t.category))
    return [...set].sort()
  }, [monthTx])

  const filtered = useMemo(() => {
    return monthTx.filter((t) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false
      return true
    })
  }, [monthTx, typeFilter, categoryFilter])

  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    for (const t of filtered) {
      const arr = map.get(t.date) ?? []
      arr.push(t)
      map.set(t.date, arr)
    }
    return [...map.entries()].sort(([a], [b]) => (a < b ? 1 : -1))
  }, [filtered])

  const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']
  function formatDate(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00')
    return `${d.getMonth() + 1}月${d.getDate()}日（${DAY_LABELS[d.getDay()]}）`
  }

  return (
    <div className="space-y-3">
      {/* 絞り込みトグル */}
      <div className="flex justify-end">
        <button
          onClick={() => setFilterOpen((v) => !v)}
          className={
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition ' +
            (isFiltered
              ? 'bg-slate-700 text-white border-slate-700'
              : 'bg-white text-slate-500 border-slate-200 active:bg-slate-50')
          }
        >
          <span>絞り込み</span>
          {isFiltered && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />}
          <span className="text-[10px]">{filterOpen ? '▲' : '▼'}</span>
        </button>
      </div>

      {filterOpen && (
        <div className="bg-white rounded-2xl p-3 shadow-sm space-y-2">
          <div className="flex gap-1.5">
            {(['all', 'expense', 'income'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setTypeFilter(v)}
                className={
                  'px-3 py-1 rounded-full text-xs font-medium border transition ' +
                  (typeFilter === v
                    ? 'bg-slate-700 text-white border-slate-700'
                    : 'bg-white text-slate-500 border-slate-200 active:bg-slate-50')
                }
              >
                {v === 'all' ? 'すべて' : v === 'expense' ? '支出' : '収入'}
              </button>
            ))}
          </div>
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setCategoryFilter('all')}
                className={
                  'px-3 py-1 rounded-full text-xs font-medium border transition ' +
                  (categoryFilter === 'all'
                    ? 'bg-slate-700 text-white border-slate-700'
                    : 'bg-white text-slate-500 border-slate-200 active:bg-slate-50')
                }
              >
                全カテゴリ
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={
                    'px-3 py-1 rounded-full text-xs font-medium border transition ' +
                    (categoryFilter === cat
                      ? 'bg-slate-700 text-white border-slate-700'
                      : 'bg-white text-slate-500 border-slate-200 active:bg-slate-50')
                  }
                >
                  {categoryInfo(cat).icon} {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {grouped.length === 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm text-sm text-slate-400">
          記録がありません
        </div>
      )}

      {grouped.map(([date, txs]) => {
        const dayExpense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
        const dayIncome = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
        return (
          <div key={date} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="flex justify-between items-center px-4 py-2.5 bg-slate-100 border-b border-slate-200">
              <span className="text-xs font-semibold text-slate-600">{formatDate(date)}</span>
              <div className="flex gap-2 text-xs">
                {dayIncome > 0 && <span className="text-emerald-600">+{formatYen(dayIncome)}</span>}
                {dayExpense > 0 && <span className="text-rose-400">-{formatYen(dayExpense)}</span>}
              </div>
            </div>
            <div className="px-4 divide-y divide-slate-50">
              {txs.map((t) => {
                const info = categoryInfo(t.category)
                return (
                  <button
                    key={t.id}
                    onClick={() => onEditTx?.(t)}
                    className="w-full flex justify-between items-center py-3 text-left active:bg-slate-50"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{info.icon}</span>
                      <div>
                        <div className="text-sm text-slate-700">{t.category}</div>
                        {t.memo && <div className="text-xs text-slate-400">{t.memo}</div>}
                      </div>
                    </div>
                    <span
                      className={
                        'text-sm font-semibold ' +
                        (t.type === 'income' ? 'text-emerald-600' : 'text-rose-500')
                      }
                    >
                      {t.type === 'income' ? '+' : '-'}
                      {formatYen(t.amount)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
