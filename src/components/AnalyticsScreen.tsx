import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { transactionService } from '../lib/services/transactionService'
import { supabase } from '../lib/supabase'
import { useProfileQuery } from '../hooks/queries/useProfileQuery'
import { useBudgetQuery } from '../hooks/queries/useBudgetQuery'
import { useFixedExpensesQuery } from '../hooks/queries/useFixedExpensesQuery'
import { useConsumablesQuery } from '../hooks/queries/useConsumablesQuery'
import { useTransactionsQuery } from '../hooks/queries/useTransactionsQuery'
import { useQuery } from '@tanstack/react-query'
import { PAYMENT_TYPES } from '../constants'
import { useStoreTypes } from '../hooks/useStoreTypes'
import { categoryInfo, formatYen, shiftMonth, todayStr } from '../utils'
import { EMPTY_BUDGET_SETTINGS } from '../lib/services/budgetService'
import { useSummaryCalculations } from '../hooks/useSummaryCalculations'
import MonthSwitcher from './ui/MonthSwitcher'
import YearSwitcher from './ui/YearSwitcher'
import { TabGroup } from './ui/TabGroup'
import ScreenHeader from './ui/ScreenHeader'

type Period = 'monthly' | 'yearly' | 'all'

interface Props {
  userId: string
}

export default function AnalyticsScreen({ userId }: Props) {
  const navigate = useNavigate()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const { items: storeTypes } = useStoreTypes()
  const [month, setMonth] = useState(todayStr().slice(0, 7))
  const [period, setPeriod] = useState<Period>('monthly')

  const year = month.slice(0, 4)

  const { data: allTransactions = [] } = useQuery({
    queryKey: ['transactions', userId, 'all'],
    queryFn: async () => {
      const { data } = await supabase
        .from('transactions')
        .select('date, type, amount, category, store_type, payment_type')
        .eq('user_id', userId)
      return data ?? []
    },
    enabled: !!userId,
  })

  const { data: profile, isError: profileError } = useProfileQuery(userId)
  const householdMembers = profile?.household_members ?? 1

  const { data: transactions = [], isError: txError } = useTransactionsQuery(userId, month)
  const { data: yearTransactions = [], isError: yearTxError } = useQuery({
    queryKey: ['transactions', userId, year, 'yearly'],
    queryFn: () => transactionService.fetchByYear(userId, year),
    enabled: !!userId,
  })
  const { data: fixedExpenses = [], isError: fixedError } = useFixedExpensesQuery(userId)
  const { data: consumables = [], isError: consumablesError } = useConsumablesQuery(userId)
  const { data: budget = EMPTY_BUDGET_SETTINGS, isError: budgetError } = useBudgetQuery(
    userId,
    month
  )

  const fetchError =
    profileError || txError || yearTxError || fixedError || consumablesError || budgetError
      ? 'データの読み込みに失敗しました'
      : null

  const dailyExpenses = useMemo(() => {
    const [y, m] = month.split('-').map(Number)
    const daysInMonth = new Date(y, m, 0).getDate()
    const map = new Map<number, number>()
    for (const t of transactions) {
      if (t.type !== 'expense') continue
      const day = parseInt(t.date.slice(8))
      map.set(day, (map.get(day) ?? 0) + t.amount)
    }
    return Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      amount: map.get(i + 1) ?? 0,
    }))
  }, [transactions, month])

  const periodSource =
    period === 'monthly' ? transactions : period === 'yearly' ? yearTransactions : allTransactions

  const periodStats = useMemo(() => {
    const src = periodSource
    return {
      recordDays: new Set(src.map((t) => t.date)).size,
      recordCount: src.length,
    }
  }, [periodSource])

  const storeCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of periodSource) {
      const key = t.store_type ?? '未記録'
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return [...map.entries()].sort(([, a], [, b]) => b - a)
  }, [periodSource])

  const storeAmounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of periodSource) {
      if (t.type !== 'expense') continue
      const key = t.store_type ?? '未記録'
      map.set(key, (map.get(key) ?? 0) + t.amount)
    }
    return [...map.entries()].sort(([, a], [, b]) => b - a)
  }, [periodSource])

  const paymentCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of periodSource) {
      const key = t.payment_type ?? '未記録'
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return [...map.entries()].sort(([, a], [, b]) => b - a)
  }, [periodSource])

  const paymentAmounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of periodSource) {
      if (t.type !== 'expense') continue
      const key = t.payment_type ?? '未記録'
      map.set(key, (map.get(key) ?? 0) + t.amount)
    }
    return [...map.entries()].sort(([, a], [, b]) => b - a)
  }, [periodSource])

  const monthlyExpenses = useMemo(() => {
    const map = new Map<number, number>()
    for (const t of yearTransactions) {
      if (t.type !== 'expense') continue
      const m = parseInt(t.date.slice(5, 7))
      map.set(m, (map.get(m) ?? 0) + t.amount)
    }
    return Array.from({ length: 12 }, (_, i) => ({ month: i + 1, amount: map.get(i + 1) ?? 0 }))
  }, [yearTransactions])

  const yearByCat = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of yearTransactions) {
      if (t.type !== 'expense') continue
      map.set(t.category, (map.get(t.category) ?? 0) + t.amount)
    }
    return [...map.entries()].sort(([, a], [, b]) => b - a)
  }, [yearTransactions])

  const yearExpenseTotal = useMemo(
    () => yearTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    [yearTransactions]
  )

  const allByCat = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of allTransactions) {
      if (t.type !== 'expense') continue
      map.set(t.category, (map.get(t.category) ?? 0) + t.amount)
    }
    return [...map.entries()].sort(([, a], [, b]) => b - a)
  }, [allTransactions])

  const allExpenseTotal = useMemo(
    () => allTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    [allTransactions]
  )

  const yearlyExpenses = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of allTransactions) {
      if (t.type !== 'expense') continue
      const y = t.date.slice(0, 4)
      map.set(y, (map.get(y) ?? 0) + t.amount)
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([year, amount]) => ({ year, amount }))
  }, [allTransactions])

  const { oneTimeExpense, totalFixed, totalSaved, oneTimeByCat, fixedByCat, hasBreakdown } =
    useSummaryCalculations({
      transactions,
      fixedExpenses,
      consumables,
      householdMembers,
      budget,
      month,
    })

  return (
    <div className="max-w-md mx-auto h-[100dvh] bg-surface-subtle flex flex-col overflow-hidden">
      {/* ヘッダー */}
      <div className="bg-surface border-b border-line-subtle">
        <ScreenHeader title="分析" onBack={() => navigate(-1)} />
        <div className="px-4 pt-3 pb-3">
          <TabGroup
            tabs={
              [
                { key: 'monthly', label: '月間' },
                { key: 'yearly', label: '年間' },
                { key: 'all', label: '全期間' },
              ] as { key: Period; label: string }[]
            }
            active={period}
            onChange={setPeriod}
          />
        </div>
      </div>

      {period === 'monthly' && <MonthSwitcher month={month} setMonth={setMonth} compact />}
      {period === 'yearly' && (
        <YearSwitcher
          year={year}
          onPrev={() => setMonth(shiftMonth(month, -12))}
          onNext={() => setMonth(shiftMonth(month, 12))}
        />
      )}

      {fetchError && (
        <div className="mx-4 mt-3 bg-danger-50 border border-danger-200 rounded-xl px-4 py-3 text-sm text-danger-600">
          {fetchError}
        </div>
      )}

      <div className="flex-1 p-4 space-y-4 overflow-y-auto pb-8">
        {/* 累計記録 */}
        <div className="bg-surface rounded-2xl p-4 shadow-sm">
          <div className="text-sm font-semibold text-ink mb-3">累計記録</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface-subtle rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-primary-500">{periodStats.recordDays}</div>
              <div className="text-xs text-ink-muted mt-0.5">記録日数</div>
            </div>
            <div className="bg-surface-subtle rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-primary-500">{periodStats.recordCount}</div>
              <div className="text-xs text-ink-muted mt-0.5">記録回数</div>
            </div>
          </div>
        </div>

        {/* 節約進捗 */}
        {totalSaved > 0 && (
          <div className="bg-surface rounded-2xl p-4 shadow-sm">
            <div className="text-sm font-semibold text-ink mb-1">固定費の節約効果</div>
            <div className="text-2xl font-bold text-income-600 mb-1">
              -{formatYen(Math.round(totalSaved))}
              <span className="text-sm font-normal text-ink-muted">/月</span>
            </div>
            <div className="text-xs text-ink-muted">
              累計節約 {formatYen(Math.round(totalSaved * 12))}/年換算
            </div>
          </div>
        )}

        {/* カテゴリ別内訳 */}
        {period === 'monthly' ? (
          hasBreakdown ? (
            <div className="bg-surface rounded-2xl p-4 shadow-sm space-y-3">
              <div className="text-sm font-semibold text-ink">カテゴリ別内訳</div>
              {fixedByCat.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-ink-muted">固定費</div>
                  <BreakdownBars
                    entries={fixedByCat}
                    total={Math.round(totalFixed)}
                    barColor="bg-surface-muted"
                    valueColor="text-ink"
                  />
                </div>
              )}
              {oneTimeByCat.length > 0 && (
                <div className="space-y-2">
                  {fixedByCat.length > 0 && <div className="h-px bg-surface-hover" />}
                  <div className="text-xs font-semibold text-ink-muted">出費</div>
                  <BreakdownBars
                    entries={oneTimeByCat}
                    total={oneTimeExpense}
                    barColor="bg-warning-400"
                    valueColor="text-warning-600"
                    onItemClick={(cat) =>
                      navigate('/expense-filter', { state: { categoryFilter: cat } })
                    }
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="bg-surface rounded-2xl p-4 shadow-sm text-sm text-ink-muted text-center">
              この月のデータがありません
            </div>
          )
        ) : period === 'yearly' ? (
          yearByCat.length > 0 ? (
            <div className="bg-surface rounded-2xl p-4 shadow-sm space-y-3">
              <div className="text-sm font-semibold text-ink">カテゴリ別内訳</div>
              <BreakdownBars
                entries={yearByCat}
                total={yearExpenseTotal}
                barColor="bg-warning-400"
                valueColor="text-warning-600"
                onItemClick={(cat) =>
                  navigate('/expense-filter', { state: { categoryFilter: cat } })
                }
              />
            </div>
          ) : (
            <div className="bg-surface rounded-2xl p-4 shadow-sm text-sm text-ink-muted text-center">
              この年のデータがありません
            </div>
          )
        ) : allByCat.length > 0 ? (
          <div className="bg-surface rounded-2xl p-4 shadow-sm space-y-3">
            <div className="text-sm font-semibold text-ink">カテゴリ別内訳</div>
            <BreakdownBars
              entries={allByCat}
              total={allExpenseTotal}
              barColor="bg-warning-400"
              valueColor="text-warning-600"
              onItemClick={(cat) => navigate('/expense-filter', { state: { categoryFilter: cat } })}
            />
          </div>
        ) : (
          <div className="bg-surface rounded-2xl p-4 shadow-sm text-sm text-ink-muted text-center">
            データがありません
          </div>
        )}

        {/* 日別/月別/年別出費棒グラフ */}
        <div className="bg-surface rounded-2xl p-4 shadow-sm space-y-3">
          <div className="text-sm font-semibold text-ink">
            {period === 'monthly' ? '日別出費' : period === 'yearly' ? '月別出費' : '年別出費'}
          </div>
          {period === 'monthly' ? (
            <DailyExpenseChart entries={dailyExpenses} />
          ) : period === 'yearly' ? (
            <MonthlyExpenseChart entries={monthlyExpenses} />
          ) : (
            <YearlyExpenseChart entries={yearlyExpenses} />
          )}
        </div>

        {/* 店舗種別 */}
        <div className="bg-surface rounded-2xl p-4 shadow-sm space-y-4">
          <div className="text-sm font-semibold text-ink">店舗種別</div>
          <div className="space-y-1">
            <div className="text-xs font-semibold text-ink-muted">記録数</div>
            <StoreBars
              entries={storeCounts}
              valueType="count"
              storeTypes={storeTypes}
              onItemClick={(storeName) =>
                navigate('/expense-filter', { state: { storeTypeFilter: storeName } })
              }
            />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-semibold text-ink-muted">合計額</div>
            <StoreBars
              entries={storeAmounts}
              valueType="amount"
              storeTypes={storeTypes}
              onItemClick={(storeName) =>
                navigate('/expense-filter', { state: { storeTypeFilter: storeName } })
              }
            />
          </div>
        </div>

        {/* 支払い方法別 */}
        <div className="bg-surface rounded-2xl p-4 shadow-sm space-y-4">
          <div className="text-sm font-semibold text-ink">支払い方法別</div>
          <div className="space-y-1">
            <div className="text-xs font-semibold text-ink-muted">記録数</div>
            <PaymentBars
              entries={paymentCounts}
              valueType="count"
              onItemClick={(paymentType) =>
                navigate('/expense-filter', { state: { paymentTypeFilter: paymentType } })
              }
            />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-semibold text-ink-muted">合計額</div>
            <PaymentBars
              entries={paymentAmounts}
              valueType="amount"
              onItemClick={(paymentType) =>
                navigate('/expense-filter', { state: { paymentTypeFilter: paymentType } })
              }
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Daily Expense Chart ────────────────────────────────────────

function niceMax(value: number, steps = 4): number {
  if (value <= 0) return steps
  const rough = value / steps
  const mag = Math.pow(10, Math.floor(Math.log10(rough)))
  const factor = [1, 2, 3, 5, 10].find((f) => f * mag >= rough) ?? 10
  return factor * mag * steps
}

function DailyExpenseChart({ entries }: { entries: { day: number; amount: number }[] }) {
  const rawMax = Math.max(...entries.map((e) => e.amount), 1)
  const max = niceMax(rawMax)
  const hasData = entries.some((e) => e.amount > 0)

  if (!hasData) {
    return <div className="text-sm text-ink-muted py-1">データがありません</div>
  }

  const CHART_H = 120
  const LABEL_W = 48 // 左の金額ラベル幅
  const DAY_H = 16 // 日付ラベルの高さ
  const BAR_H = CHART_H - DAY_H

  const gridRatios = [1, 0.75, 0.5, 0.25]

  return (
    <div className="flex gap-1">
      {/* 縦軸ラベル */}
      <div
        className="flex flex-col justify-between pb-4 shrink-0"
        style={{ width: LABEL_W, height: CHART_H }}
      >
        {gridRatios.map((r) => (
          <span key={r} className="text-[9px] text-ink-muted text-right leading-none">
            {formatYen(Math.round(max * r))}
          </span>
        ))}
      </div>

      {/* グラフ本体 */}
      <div className="relative flex-1 min-w-0" style={{ height: CHART_H }}>
        {/* グリッド線 */}
        <div
          className="absolute left-0 right-0 pointer-events-none"
          style={{ top: 0, height: BAR_H }}
        >
          {gridRatios.map((r) => (
            <div
              key={r}
              className="absolute left-0 right-0 border-t border-line-subtle"
              style={{ top: `${(1 - r) * 100}%` }}
            />
          ))}
        </div>

        {/* 棒グラフ + 日付ラベル */}
        <div className="absolute inset-0 flex items-end gap-px overflow-x-auto">
          {entries.map(({ day, amount }) => {
            const pct = amount > 0 ? (amount / max) * 100 : 0
            return (
              <div
                key={day}
                className="flex flex-col items-center flex-1 min-w-0"
                style={{ height: '100%' }}
              >
                <div className="w-full flex flex-col justify-end" style={{ height: BAR_H }}>
                  {amount > 0 && (
                    <div
                      className="w-full bg-danger-400 rounded-t-sm"
                      style={{ height: `${pct}%` }}
                    />
                  )}
                </div>
                <div
                  className="text-[9px] text-ink-muted leading-none"
                  style={{
                    height: DAY_H,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {day % 5 === 0 || day === 1 ? day : ''}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Monthly Expense Chart ──────────────────────────────────────

function MonthlyExpenseChart({ entries }: { entries: { month: number; amount: number }[] }) {
  const rawMax = Math.max(...entries.map((e) => e.amount), 1)
  const max = niceMax(rawMax)
  const hasData = entries.some((e) => e.amount > 0)

  if (!hasData) {
    return <div className="text-sm text-ink-muted py-1">データがありません</div>
  }

  const CHART_H = 120
  const LABEL_W = 48
  const MONTH_H = 16
  const BAR_H = CHART_H - MONTH_H
  const gridRatios = [1, 0.75, 0.5, 0.25]

  return (
    <div className="flex gap-1">
      <div
        className="flex flex-col justify-between pb-4 shrink-0"
        style={{ width: LABEL_W, height: CHART_H }}
      >
        {gridRatios.map((r) => (
          <span key={r} className="text-[9px] text-ink-muted text-right leading-none">
            {formatYen(Math.round(max * r))}
          </span>
        ))}
      </div>
      <div className="relative flex-1 min-w-0" style={{ height: CHART_H }}>
        <div
          className="absolute left-0 right-0 pointer-events-none"
          style={{ top: 0, height: BAR_H }}
        >
          {gridRatios.map((r) => (
            <div
              key={r}
              className="absolute left-0 right-0 border-t border-line-subtle"
              style={{ top: `${(1 - r) * 100}%` }}
            />
          ))}
        </div>
        <div className="absolute inset-0 flex items-end gap-px">
          {entries.map(({ month, amount }) => {
            const pct = amount > 0 ? (amount / max) * 100 : 0
            return (
              <div
                key={month}
                className="flex flex-col items-center flex-1 min-w-0"
                style={{ height: '100%' }}
              >
                <div className="w-full flex flex-col justify-end" style={{ height: BAR_H }}>
                  {amount > 0 && (
                    <div
                      className="w-full bg-danger-400 rounded-t-sm"
                      style={{ height: `${pct}%` }}
                    />
                  )}
                </div>
                <div
                  className="text-[9px] text-ink-muted leading-none"
                  style={{
                    height: MONTH_H,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {month}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Yearly Expense Chart ───────────────────────────────────────

function YearlyExpenseChart({ entries }: { entries: { year: string; amount: number }[] }) {
  const rawMax = Math.max(...entries.map((e) => e.amount), 1)
  const max = niceMax(rawMax)
  const hasData = entries.some((e) => e.amount > 0)

  if (!hasData) {
    return <div className="text-sm text-ink-muted py-1">データがありません</div>
  }

  const CHART_H = 120
  const LABEL_W = 48
  const YEAR_H = 16
  const BAR_H = CHART_H - YEAR_H
  const gridRatios = [1, 0.75, 0.5, 0.25]

  return (
    <div className="flex gap-1">
      <div
        className="flex flex-col justify-between pb-4 shrink-0"
        style={{ width: LABEL_W, height: CHART_H }}
      >
        {gridRatios.map((r) => (
          <span key={r} className="text-[9px] text-ink-muted text-right leading-none">
            {formatYen(Math.round(max * r))}
          </span>
        ))}
      </div>
      <div className="relative flex-1 min-w-0" style={{ height: CHART_H }}>
        <div
          className="absolute left-0 right-0 pointer-events-none"
          style={{ top: 0, height: BAR_H }}
        >
          {gridRatios.map((r) => (
            <div
              key={r}
              className="absolute left-0 right-0 border-t border-line-subtle"
              style={{ top: `${(1 - r) * 100}%` }}
            />
          ))}
        </div>
        <div className="absolute inset-0 flex items-end gap-1">
          {entries.map(({ year, amount }) => {
            const pct = amount > 0 ? (amount / max) * 100 : 0
            return (
              <div
                key={year}
                className="flex flex-col items-center flex-1 min-w-0"
                style={{ height: '100%' }}
              >
                <div className="w-full flex flex-col justify-end" style={{ height: BAR_H }}>
                  {amount > 0 && (
                    <div
                      className="w-full bg-danger-400 rounded-t-sm"
                      style={{ height: `${pct}%` }}
                    />
                  )}
                </div>
                <div
                  className="text-[9px] text-ink-muted leading-none"
                  style={{
                    height: YEAR_H,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {year.slice(2)}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Store Bars ─────────────────────────────────────────────────

function StoreBars({
  entries,
  valueType,
  storeTypes,
  onItemClick,
}: {
  entries: [string, number][]
  valueType: 'amount' | 'count'
  storeTypes: { name: string; icon: string }[]
  onItemClick?: (storeName: string) => void
}) {
  if (entries.length === 0) {
    return <div className="text-sm text-ink-muted py-1">データがありません</div>
  }
  const max = Math.max(...entries.map(([, v]) => v))
  const total = entries.reduce((s, [, v]) => s + v, 0)
  const barColor = valueType === 'amount' ? 'bg-danger-400' : 'bg-indigo-400'
  const valueColor = valueType === 'amount' ? 'text-danger-500' : 'text-ink'
  const fmt = (v: number) => (valueType === 'amount' ? `-${formatYen(Math.round(v))}` : `${v}件`)
  return (
    <div className="space-y-2">
      {entries.map(([storeName, value]) => {
        const info = storeTypes.find((s) => s.name === storeName)
        const icon = storeName === '未記録' ? '−' : (info?.icon ?? '🏷️')
        const pct = max > 0 ? (value / max) * 100 : 0
        const clickable = onItemClick != null
        return (
          <div
            key={storeName}
            onClick={clickable ? () => onItemClick(storeName) : undefined}
            className={clickable ? 'cursor-pointer relative z-0 group' : undefined}
          >
            {clickable && (
              <div className="absolute -inset-x-1 -inset-y-1 -z-10 rounded-lg transition-colors group-active:bg-surface-hover" />
            )}
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-xs text-ink flex items-center gap-1">
                <span>{icon}</span>
                {storeName}
              </span>
              <span className={`text-xs font-semibold ${valueColor}`}>{fmt(value)}</span>
            </div>
            <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
              <div
                className={`h-full ${barColor} rounded-full transition-all`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
      <div className="flex justify-between items-center pt-1 border-t border-line-subtle">
        <span className="text-xs text-ink-muted">合計</span>
        <span className={`text-sm font-semibold ${valueColor}`}>{fmt(total)}</span>
      </div>
    </div>
  )
}

// ─── Payment Bars ───────────────────────────────────────────────

function PaymentBars({
  entries,
  valueType,
  onItemClick,
}: {
  entries: [string, number][]
  valueType: 'amount' | 'count'
  onItemClick?: (paymentType: string) => void
}) {
  if (entries.length === 0) {
    return <div className="text-sm text-ink-muted py-1">データがありません</div>
  }
  const max = Math.max(...entries.map(([, v]) => v))
  const total = entries.reduce((s, [, v]) => s + v, 0)
  const barColor = valueType === 'amount' ? 'bg-danger-400' : 'bg-indigo-400'
  const valueColor = valueType === 'amount' ? 'text-danger-500' : 'text-ink'
  const fmt = (v: number) => (valueType === 'amount' ? `-${formatYen(Math.round(v))}` : `${v}件`)
  return (
    <div className="space-y-2">
      {entries.map(([paymentType, value]) => {
        const info = PAYMENT_TYPES.find((p) => p.type === paymentType)
        const icon = paymentType === '未記録' ? '−' : (info?.icon ?? '💳')
        const label = paymentType === '未記録' ? '未記録' : (info?.name ?? paymentType)
        const pct = max > 0 ? (value / max) * 100 : 0
        const clickable = onItemClick != null
        return (
          <div
            key={paymentType}
            onClick={clickable ? () => onItemClick(paymentType) : undefined}
            className={clickable ? 'cursor-pointer relative z-0 group' : undefined}
          >
            {clickable && (
              <div className="absolute -inset-x-1 -inset-y-1 -z-10 rounded-lg transition-colors group-active:bg-surface-hover" />
            )}
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-xs text-ink flex items-center gap-1">
                <span>{icon}</span>
                {label}
              </span>
              <span className={`text-xs font-semibold ${valueColor}`}>{fmt(value)}</span>
            </div>
            <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
              <div
                className={`h-full ${barColor} rounded-full transition-all`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
      <div className="flex justify-between items-center pt-1 border-t border-line-subtle">
        <span className="text-xs text-ink-muted">合計</span>
        <span className={`text-sm font-semibold ${valueColor}`}>{fmt(total)}</span>
      </div>
    </div>
  )
}

// ─── Breakdown Bars ───────────────────────────────────────────

function BreakdownBars({
  entries,
  total,
  barColor,
  valueColor,
  onItemClick,
}: {
  entries: [string, number][]
  total: number
  barColor: string
  valueColor: string
  onItemClick?: (cat: string) => void
}) {
  if (entries.length === 0) {
    return <div className="text-sm text-ink-muted py-1">データがありません</div>
  }
  return (
    <div className="space-y-2">
      {entries.map(([cat, amt]) => {
        const pct = total > 0 ? (amt / total) * 100 : 0
        const info = categoryInfo(cat)
        const clickable = onItemClick != null
        return (
          <div
            key={cat}
            onClick={clickable ? () => onItemClick(cat) : undefined}
            className={clickable ? 'cursor-pointer relative z-0 group' : undefined}
          >
            {clickable && (
              <div className="absolute -inset-x-1 -inset-y-1 -z-10 rounded-lg transition-colors group-active:bg-surface-hover" />
            )}
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-xs text-ink flex items-center gap-1">
                <span>{info.icon}</span>
                {cat}
              </span>
              <span className={`text-xs font-semibold ${valueColor}`}>
                -{formatYen(Math.round(amt))}
              </span>
            </div>
            <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
              <div
                className={`h-full ${barColor} rounded-full transition-all`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
      <div className="flex justify-between items-center pt-1 border-t border-line-subtle">
        <span className="text-xs text-ink-muted">合計</span>
        <span className={`text-sm font-semibold ${valueColor}`}>
          -{formatYen(Math.round(total))}
        </span>
      </div>
    </div>
  )
}
