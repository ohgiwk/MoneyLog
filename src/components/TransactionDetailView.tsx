import { useMemo, useRef, useState } from 'react'
import type { Transaction } from '../lib/database.types'
import { categoryInfo, formatYen } from '../utils'
import { useTransactionFilters } from '../hooks/useTransactionFilters'
import Spinner from './ui/Spinner'

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}月${d.getDate()}日（${DAY_LABELS[d.getDay()]}）`
}

interface Props {
  transactions: Transaction[]
  month: string
  setMonth?: (m: string) => void
  availableMonths?: string[]
  loading?: boolean
  onEditTx?: (tx: Transaction) => void
}

export default function TransactionDetailView({ transactions, month, setMonth, availableMonths, loading, onEditTx }: Props) {
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

  const totalExpense = useMemo(
    () => transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    [transactions]
  )
  const totalIncome = useMemo(
    () => transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    [transactions]
  )

  const [yearOpen, setYearOpen] = useState(false)
  const [monthOpen, setMonthOpen] = useState(false)
  const yearRef = useRef<HTMLDivElement>(null)
  const monthRef = useRef<HTMLDivElement>(null)

  const currentYear = month.slice(0, 4)
  const currentMonth = month.slice(5, 7)

  const availableYears = useMemo(() => {
    if (!availableMonths) return []
    return [...new Set(availableMonths.map((m) => m.slice(0, 4)))].sort().reverse()
  }, [availableMonths])

  const availableMonthsForYear = useMemo(() => {
    if (!availableMonths) return []
    return availableMonths
      .filter((m) => m.startsWith(currentYear))
      .map((m) => m.slice(5, 7))
      .sort()
      .reverse()
  }, [availableMonths, currentYear])

  function selectYear(year: string) {
    setYearOpen(false)
    if (!setMonth) return
    // 同じ年の中で現在の月が存在すればそのまま、なければ最新月
    const candidate = `${year}-${currentMonth}`
    const monthsForYear = (availableMonths ?? []).filter((m) => m.startsWith(year))
    if (monthsForYear.includes(candidate)) {
      setMonth(candidate)
    } else if (monthsForYear.length > 0) {
      setMonth(monthsForYear[0])
    }
  }

  function selectMonth(m: string) {
    setMonthOpen(false)
    setMonth?.(`${currentYear}-${m}`)
  }

  return (
    <div className="space-y-3">
      {/* 合計サマリー */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="text-sm font-semibold text-slate-700 mb-1">出費合計</div>
        <div className="text-2xl font-bold text-rose-500">
          {formatYen(totalExpense)}
        </div>
        {totalIncome > 0 && (
          <div className="text-sm font-semibold text-emerald-600 mt-1">
            収入 +{formatYen(totalIncome)}
          </div>
        )}
      </div>

      {/* ヘッダー行: 年月ドロップダウン + 絞り込み */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {/* 年ドロップダウン */}
          {setMonth && availableMonths && availableMonths.length > 0 && (
            <div ref={yearRef} className="relative">
              <button
                onClick={() => { setYearOpen((v) => !v); setMonthOpen(false) }}
                className={
                  'flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition ' +
                  (yearOpen
                    ? 'bg-slate-700 text-white border-slate-700'
                    : 'bg-white text-slate-600 border-slate-200 active:bg-slate-50')
                }
              >
                <span>{currentYear}年</span>
                <span className="text-[10px]">{yearOpen ? '▲' : '▼'}</span>
              </button>
              {yearOpen && (
                <div className="absolute top-full mt-1 left-0 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden z-30 min-w-[80px]">
                  {availableYears.map((y) => (
                    <button
                      key={y}
                      onClick={() => selectYear(y)}
                      className={
                        'w-full text-left px-4 py-2.5 text-xs font-medium transition ' +
                        (y === currentYear
                          ? 'bg-slate-700 text-white'
                          : 'text-slate-600 active:bg-slate-50')
                      }
                    >
                      {y}年
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 月ドロップダウン */}
          {setMonth && availableMonths && availableMonths.length > 0 && (
            <div ref={monthRef} className="relative">
              <button
                onClick={() => { setMonthOpen((v) => !v); setYearOpen(false) }}
                className={
                  'flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition ' +
                  (monthOpen
                    ? 'bg-slate-700 text-white border-slate-700'
                    : 'bg-white text-slate-600 border-slate-200 active:bg-slate-50')
                }
              >
                <span>{Number(currentMonth)}月</span>
                <span className="text-[10px]">{monthOpen ? '▲' : '▼'}</span>
              </button>
              {monthOpen && (
                <div className="absolute top-full mt-1 left-0 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden z-30 min-w-[72px]">
                  {availableMonthsForYear.map((m) => (
                    <button
                      key={m}
                      onClick={() => selectMonth(m)}
                      className={
                        'w-full text-left px-4 py-2.5 text-xs font-medium transition ' +
                        (m === currentMonth
                          ? 'bg-slate-700 text-white'
                          : 'text-slate-600 active:bg-slate-50')
                      }
                    >
                      {Number(m)}月
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 絞り込みボタン */}
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

      {loading ? (
        <Spinner />
      ) : grouped.length === 0 ? (
        <div className="bg-white rounded-2xl p-4 shadow-sm text-sm text-slate-400">
          記録がありません
        </div>
      ) : null}

      {!loading && grouped.map(([date, txs]) => {
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
