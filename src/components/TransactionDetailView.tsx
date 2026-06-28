import type { Transaction } from '../lib/database.types'
import { categoryInfo, formatYen } from '../utils'
import { useTransactionFilters } from '../hooks/useTransactionFilters'

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}月${d.getDate()}日（${DAY_LABELS[d.getDay()]}）`
}

interface Props {
  transactions: Transaction[]
  month: string
  onEditTx?: (tx: Transaction) => void
}

export default function TransactionDetailView({ transactions, month, onEditTx }: Props) {
  const {
    typeFilter,
    setTypeFilter,
    categoryFilter,
    setCategoryFilter,
    filterOpen,
    setFilterOpen,
    isFiltered,
    categories,
    grouped,
  } = useTransactionFilters(transactions, month)

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
