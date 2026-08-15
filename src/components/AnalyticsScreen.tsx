import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { transactionService } from '../lib/services/transactionService'
import { useProfileQuery } from '../hooks/queries/useProfileQuery'
import { useBudgetQuery } from '../hooks/queries/useBudgetQuery'
import { useFixedExpensesQuery } from '../hooks/queries/useFixedExpensesQuery'
import { useConsumablesQuery } from '../hooks/queries/useConsumablesQuery'
import { useTransactionsQuery } from '../hooks/queries/useTransactionsQuery'
import { useQuery } from '@tanstack/react-query'
import { PAYMENT_TYPES } from '../constants'
import { useStoreTypes } from '../hooks/useStoreTypes'
import { categoryInfo, formatYen, todayStr } from '../utils'
import { EMPTY_BUDGET_SETTINGS } from '../lib/services/budgetService'
import { useSummaryCalculations } from '../hooks/useSummaryCalculations'
import MonthSwitcher from './ui/MonthSwitcher'
import { TabGroup } from './ui/TabGroup'
import ScreenHeader from './ui/ScreenHeader'

type BreakdownTab = 'fixed' | 'consumable' | 'oneTime'
type Period = 'monthly' | 'yearly'

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
  const [breakdownTab, setBreakdownTab] = useState<BreakdownTab>('fixed')
  const [storePeriod, setStorePeriod] = useState<Period>('monthly')
  const [paymentPeriod, setPaymentPeriod] = useState<Period>('monthly')

  const year = month.slice(0, 4)

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

  const storeCounts = useMemo(() => {
    const source = storePeriod === 'monthly' ? transactions : yearTransactions
    const map = new Map<string, number>()
    for (const t of source) {
      const key = t.store_type ?? '未記録'
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return [...map.entries()].sort(([, a], [, b]) => b - a)
  }, [storePeriod, transactions, yearTransactions])

  const storeAmounts = useMemo(() => {
    const source = storePeriod === 'monthly' ? transactions : yearTransactions
    const map = new Map<string, number>()
    for (const t of source) {
      if (t.type !== 'expense') continue
      const key = t.store_type ?? '未記録'
      map.set(key, (map.get(key) ?? 0) + t.amount)
    }
    return [...map.entries()].sort(([, a], [, b]) => b - a)
  }, [storePeriod, transactions, yearTransactions])

  const paymentCounts = useMemo(() => {
    const source = paymentPeriod === 'monthly' ? transactions : yearTransactions
    const map = new Map<string, number>()
    for (const t of source) {
      const key = t.payment_type ?? '未記録'
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return [...map.entries()].sort(([, a], [, b]) => b - a)
  }, [paymentPeriod, transactions, yearTransactions])

  const paymentAmounts = useMemo(() => {
    const source = paymentPeriod === 'monthly' ? transactions : yearTransactions
    const map = new Map<string, number>()
    for (const t of source) {
      if (t.type !== 'expense') continue
      const key = t.payment_type ?? '未記録'
      map.set(key, (map.get(key) ?? 0) + t.amount)
    }
    return [...map.entries()].sort(([, a], [, b]) => b - a)
  }, [paymentPeriod, transactions, yearTransactions])

  const {
    consumableExpense,
    oneTimeExpense,
    totalFixed,
    totalSaved,
    oneTimeByCat,
    fixedByCat,
    consumableByCat,
    hasBreakdown,
  } = useSummaryCalculations({
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
      </div>

      <MonthSwitcher month={month} setMonth={setMonth} />

      {fetchError && (
        <div className="mx-4 mt-3 bg-danger-50 border border-danger-200 rounded-xl px-4 py-3 text-sm text-danger-600">
          {fetchError}
        </div>
      )}

      <div className="flex-1 p-4 space-y-4 overflow-y-auto pb-8">
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
        {hasBreakdown ? (
          <div className="bg-surface rounded-2xl p-4 shadow-sm space-y-3">
            <div className="text-sm font-semibold text-ink">カテゴリ別内訳</div>
            <TabGroup
              tabs={
                [
                  { key: 'fixed', label: '固定費' },
                  { key: 'consumable', label: '定期購入' },
                  { key: 'oneTime', label: '出費' },
                ] as { key: BreakdownTab; label: string }[]
              }
              active={breakdownTab}
              onChange={setBreakdownTab}
              size="sm"
            />
            {breakdownTab === 'fixed' && (
              <BreakdownBars
                entries={fixedByCat}
                total={Math.round(totalFixed)}
                barColor="bg-surface-muted"
                valueColor="text-ink"
              />
            )}
            {breakdownTab === 'consumable' && (
              <BreakdownBars
                entries={consumableByCat}
                total={consumableExpense}
                barColor="bg-blue-400"
                valueColor="text-blue-600"
              />
            )}
            {breakdownTab === 'oneTime' && (
              <BreakdownBars
                entries={oneTimeByCat}
                total={oneTimeExpense}
                barColor="bg-warning-400"
                valueColor="text-warning-600"
              />
            )}
          </div>
        ) : (
          <div className="bg-surface rounded-2xl p-4 shadow-sm text-sm text-ink-muted text-center">
            この月のデータがありません
          </div>
        )}

        {/* 日別出費棒グラフ */}
        <div className="bg-surface rounded-2xl p-4 shadow-sm space-y-3">
          <div className="text-sm font-semibold text-ink">日別出費</div>
          <DailyExpenseChart entries={dailyExpenses} />
        </div>

        {/* 店舗種別 */}
        <div className="bg-surface rounded-2xl p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-ink">店舗種別</div>
            <div className="flex rounded-lg overflow-hidden border border-line text-xs">
              <button
                onClick={() => setStorePeriod('monthly')}
                className={`px-2.5 py-1 ${storePeriod === 'monthly' ? 'bg-surface-strong text-white' : 'bg-surface text-ink-muted'}`}
              >
                月間
              </button>
              <button
                onClick={() => setStorePeriod('yearly')}
                className={`px-2.5 py-1 ${storePeriod === 'yearly' ? 'bg-surface-strong text-white' : 'bg-surface text-ink-muted'}`}
              >
                年間
              </button>
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs font-semibold text-ink-muted">記録数</div>
            <StoreBars entries={storeCounts} valueType="count" storeTypes={storeTypes} />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-semibold text-ink-muted">合計額</div>
            <StoreBars entries={storeAmounts} valueType="amount" storeTypes={storeTypes} />
          </div>
        </div>

        {/* 支払い方法別 */}
        <div className="bg-surface rounded-2xl p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-ink">支払い方法別</div>
            <div className="flex rounded-lg overflow-hidden border border-line text-xs">
              <button
                onClick={() => setPaymentPeriod('monthly')}
                className={`px-2.5 py-1 ${paymentPeriod === 'monthly' ? 'bg-surface-strong text-white' : 'bg-surface text-ink-muted'}`}
              >
                月間
              </button>
              <button
                onClick={() => setPaymentPeriod('yearly')}
                className={`px-2.5 py-1 ${paymentPeriod === 'yearly' ? 'bg-surface-strong text-white' : 'bg-surface text-ink-muted'}`}
              >
                年間
              </button>
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs font-semibold text-ink-muted">記録数</div>
            <PaymentBars entries={paymentCounts} valueType="count" />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-semibold text-ink-muted">合計額</div>
            <PaymentBars entries={paymentAmounts} valueType="amount" />
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

// ─── Store Bars ─────────────────────────────────────────────────

function StoreBars({
  entries,
  valueType,
  storeTypes,
}: {
  entries: [string, number][]
  valueType: 'amount' | 'count'
  storeTypes: { name: string; icon: string }[]
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
        return (
          <div key={storeName}>
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
}: {
  entries: [string, number][]
  valueType: 'amount' | 'count'
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
        return (
          <div key={paymentType}>
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
}: {
  entries: [string, number][]
  total: number
  barColor: string
  valueColor: string
}) {
  if (entries.length === 0) {
    return <div className="text-sm text-ink-muted py-1">データがありません</div>
  }
  return (
    <div className="space-y-2">
      {entries.map(([cat, amt]) => {
        const pct = total > 0 ? (amt / total) * 100 : 0
        const info = categoryInfo(cat)
        return (
          <div key={cat}>
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
