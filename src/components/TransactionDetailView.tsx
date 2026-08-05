import Card from './ui/Card'
import SwipeableRow from './ui/SwipeableRow'
import { useMemo, useRef, useState } from 'react'
import type { Transaction } from '../lib/database.types'
import { MEAL_TYPES, STORE_TYPES } from '../constants'
import { categoryInfo, formatDateWithWeekday, formatYen } from '../utils'
import { useTransactionFilters } from '../hooks/useTransactionFilters'
import Spinner from './ui/Spinner'

interface Props {
  transactions: Transaction[]
  month: string
  setMonth?: (m: string) => void
  availableMonths?: string[]
  loading?: boolean
  onEditTx?: (tx: Transaction) => void
  onDeleteTx?: (id: string) => void
  onDuplicateTx?: (tx: Transaction) => void
  startDay?: number
  budget?: number
  dateFrom?: string
  setDateFrom?: (v: string) => void
  dateTo?: string
  setDateTo?: (v: string) => void
  typeFilter?: 'all' | 'expense' | 'income'
  setTypeFilter?: (v: 'all' | 'expense' | 'income') => void
  categoryFilter?: string
  setCategoryFilter?: (v: string) => void
}

export default function TransactionDetailView({
  transactions,
  month,
  setMonth,
  availableMonths,
  loading,
  onEditTx,
  onDeleteTx,
  onDuplicateTx,
  startDay = 1,
  budget = 0,
  dateFrom: controlledDateFrom,
  setDateFrom: controlledSetDateFrom,
  dateTo: controlledDateTo,
  setDateTo: controlledSetDateTo,
  typeFilter: controlledTypeFilter,
  setTypeFilter: controlledSetTypeFilter,
  categoryFilter: controlledCategoryFilter,
  setCategoryFilter: controlledSetCategoryFilter,
}: Props) {
  const {
    typeFilter,
    setTypeFilter,
    categoryFilter,
    setCategoryFilter,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    filterOpen,
    setFilterOpen,
    isFiltered,
    categories,
    filtered,
    grouped,
  } = useTransactionFilters(
    transactions,
    month,
    startDay,
    controlledSetDateFrom && controlledSetDateTo
      ? {
          dateFrom: controlledDateFrom ?? '',
          setDateFrom: controlledSetDateFrom,
          dateTo: controlledDateTo ?? '',
          setDateTo: controlledSetDateTo,
        }
      : undefined,
    controlledSetTypeFilter && controlledSetCategoryFilter
      ? {
          typeFilter: controlledTypeFilter ?? 'all',
          setTypeFilter: controlledSetTypeFilter,
          categoryFilter: controlledCategoryFilter ?? 'all',
          setCategoryFilter: controlledSetCategoryFilter,
        }
      : undefined
  )

  const totalExpense = useMemo(
    () => filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    [filtered]
  )
  const totalIncome = useMemo(
    () => filtered.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    [filtered]
  )

  const [yearOpen, setYearOpen] = useState(false)
  const [monthOpen, setMonthOpen] = useState(false)
  const yearRef = useRef<HTMLDivElement>(null)
  const monthRef = useRef<HTMLDivElement>(null)
  const filterBtnRef = useRef<HTMLButtonElement>(null)
  const [filterPos, setFilterPos] = useState<{ top: number; right: number } | null>(null)

  function toggleFilterOpen() {
    if (!filterOpen && filterBtnRef.current) {
      const rect = filterBtnRef.current.getBoundingClientRect()
      setFilterPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    }
    setFilterOpen((v) => !v)
  }

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
      <div className="bg-surface rounded-2xl p-4 shadow-sm">
        <div className="text-sm font-semibold text-ink mb-1">出費合計</div>
        <div className="flex items-baseline gap-1.5">
          <div className="text-2xl font-bold text-danger-500">
            {formatYen(totalExpense)}
          </div>
          {totalIncome > 0 && (
            <div className="text-sm font-semibold text-income-600">
              <span className="text-ink-muted">/</span> 収入 {formatYen(totalIncome)}
            </div>
          )}
        </div>
        {budget > 0 && (
          <div className="text-xs text-ink-muted mt-1">
            予算 {formatYen(budget)}
            {' / 残額 '}
            <span
              className={
                budget - totalExpense < 0 ? 'text-danger-500 font-semibold' : 'text-income-600 font-semibold'
              }
            >
              {formatYen(budget - totalExpense)}
            </span>
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
                    ? 'bg-surface-strong text-white border-line-strong'
                    : 'bg-surface text-ink border-line active:bg-surface-subtle')
                }
              >
                <span>{currentYear}年</span>
                <span className="text-[10px]">{yearOpen ? '▲' : '▼'}</span>
              </button>
              {yearOpen && (
                <div className="absolute top-full mt-1 left-0 bg-surface rounded-xl shadow-lg border border-line-subtle overflow-hidden z-30 min-w-[80px]">
                  {availableYears.map((y) => (
                    <button
                      key={y}
                      onClick={() => selectYear(y)}
                      className={
                        'w-full text-left px-4 py-2.5 text-xs font-medium transition ' +
                        (y === currentYear
                          ? 'bg-surface-strong text-white'
                          : 'text-ink active:bg-surface-subtle')
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
                    ? 'bg-surface-strong text-white border-line-strong'
                    : 'bg-surface text-ink border-line active:bg-surface-subtle')
                }
              >
                <span>{Number(currentMonth)}月</span>
                <span className="text-[10px]">{monthOpen ? '▲' : '▼'}</span>
              </button>
              {monthOpen && (
                <div className="absolute top-full mt-1 left-0 bg-surface rounded-xl shadow-lg border border-line-subtle overflow-hidden z-30 min-w-[72px]">
                  {availableMonthsForYear.map((m) => (
                    <button
                      key={m}
                      onClick={() => selectMonth(m)}
                      className={
                        'w-full text-left px-4 py-2.5 text-xs font-medium transition ' +
                        (m === currentMonth
                          ? 'bg-surface-strong text-white'
                          : 'text-ink active:bg-surface-subtle')
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
        <div className="relative">
          <button
            ref={filterBtnRef}
            onClick={toggleFilterOpen}
            className={
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition ' +
              (isFiltered
                ? 'bg-surface-strong text-white border-line-strong'
                : 'bg-surface text-ink-muted border-line active:bg-surface-subtle')
            }
          >
            <span>絞り込み</span>
            {isFiltered && <span className="w-1.5 h-1.5 rounded-full bg-primary-400 inline-block" />}
            <span className="text-[10px]">{filterOpen ? '▲' : '▼'}</span>
          </button>

          {filterOpen && filterPos && (
            <>
              <button
                type="button"
                aria-label="閉じる"
                className="fixed inset-0 z-30 cursor-default"
                onClick={() => setFilterOpen(false)}
              />
              <div
                style={{ top: filterPos.top, right: filterPos.right }}
                className="fixed z-40 w-72 max-w-[85vw] max-h-[70vh] overflow-y-auto bg-surface rounded-2xl p-3 shadow-lg border border-line-subtle space-y-3"
              >
                <div className="space-y-1">
                  <div className="text-[11px] font-semibold text-ink-muted">種別</div>
                  <div className="flex gap-1.5">
                    {(['all', 'expense', 'income'] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setTypeFilter(v)}
                        className={
                          'px-3 py-1 rounded-full text-xs font-medium border transition ' +
                          (typeFilter === v
                            ? 'bg-surface-strong text-white border-line-strong'
                            : 'bg-surface text-ink-muted border-line active:bg-surface-subtle')
                        }
                      >
                        {v === 'all' ? 'すべて' : v === 'expense' ? '支出' : '収入'}
                      </button>
                    ))}
                  </div>
                </div>
                {categories.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[11px] font-semibold text-ink-muted">カテゴリ</div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => setCategoryFilter('all')}
                        className={
                          'px-3 py-1 rounded-full text-xs font-medium border transition ' +
                          (categoryFilter === 'all'
                            ? 'bg-surface-strong text-white border-line-strong'
                            : 'bg-surface text-ink-muted border-line active:bg-surface-subtle')
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
                              ? 'bg-surface-strong text-white border-line-strong'
                              : 'bg-surface text-ink-muted border-line active:bg-surface-subtle')
                          }
                        >
                          {categoryInfo(cat).icon} {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  <div className="text-[11px] font-semibold text-ink-muted">期間</div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="flex-1 min-w-0 px-2 py-1 rounded-lg text-xs border border-line text-ink"
                    />
                    <span className="text-xs text-ink-muted">〜</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="flex-1 min-w-0 px-2 py-1 rounded-lg text-xs border border-line text-ink"
                    />
                  </div>
                </div>
                {isFiltered && (
                  <button
                    onClick={() => {
                      setTypeFilter('all')
                      setCategoryFilter('all')
                      setDateFrom('')
                      setDateTo('')
                    }}
                    className="w-full text-center py-1.5 rounded-lg text-xs font-medium text-ink-muted border border-line active:bg-surface-subtle"
                  >
                    絞り込みをリセット
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : grouped.length === 0 ? (
        <div className="bg-surface rounded-2xl p-4 shadow-sm text-sm text-ink-muted">
          記録がありません
        </div>
      ) : null}

      {!loading && grouped.map(([date, txs]) => {
        const dayExpense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
        const dayIncome = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
        return (
          <Card key={date}>
            <div className="flex justify-between items-center px-4 py-2.5 bg-surface-hover border-b border-line">
              <span className="text-xs font-semibold text-ink">{formatDateWithWeekday(date)}</span>
              <div className="flex gap-2 text-xs">
                {dayIncome > 0 && <span className="text-income-600">+{formatYen(dayIncome)}</span>}
                {dayExpense > 0 && <span className="text-danger-400">-{formatYen(dayExpense)}</span>}
              </div>
            </div>
            <div className="divide-y divide-line-subtle">
              {txs.map((t) => {
                const info = categoryInfo(t.category)
                const store = t.store_type ? STORE_TYPES.find((s) => s.name === t.store_type) : undefined
                const meal = t.category === '食費' && t.meal_type ? MEAL_TYPES.find((m) => m.name === t.meal_type) : undefined
                return (
                  <SwipeableRow
                    key={t.id}
                    onEdit={() => onEditTx?.(t)}
                    onDelete={() => onDeleteTx?.(t.id)}
                    onDuplicate={() => onDuplicateTx?.(t)}
                  >
                    <div className="px-4 flex justify-between items-center py-3 active:bg-surface-subtle">
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">{info.icon}</span>
                        <div>
                          <div className="text-sm text-ink">{t.category}</div>
                          {(meal || store || t.memo) && (
                            <div className="text-xs text-ink-muted flex items-center gap-1">
                              {meal && (
                                <span className="flex items-center gap-0.5">
                                  <span>{meal.icon}</span>
                                  <span>{meal.name}</span>
                                </span>
                              )}
                              {meal && (store || t.memo) && <span>/</span>}
                              {store && (
                                <span className="flex items-center gap-0.5">
                                  <span>{store.icon}</span>
                                  <span>{store.name}</span>
                                </span>
                              )}
                              {store && t.memo && <span>/</span>}
                              {t.memo && <span>{t.memo}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                      <span
                        className={
                          'text-sm font-semibold ' +
                          (t.type === 'income' ? 'text-income-600' : 'text-danger-500')
                        }
                      >
                        {t.type === 'income' ? '+' : '-'}
                        {formatYen(t.amount)}
                      </span>
                    </div>
                  </SwipeableRow>
                )
              })}
            </div>
          </Card>
        )
      })}
    </div>
  )
}
