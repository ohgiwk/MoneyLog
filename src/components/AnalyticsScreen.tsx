import { useEffect, useMemo, useState } from 'react'
import { transactionService } from '../lib/services/transactionService'
import { fixedExpenseService } from '../lib/services/fixedExpenseService'
import { consumableService } from '../lib/services/consumableService'
import { profileService } from '../lib/services/profileService'
import type { Consumable, FixedExpense, Transaction } from '../lib/database.types'
import { STORE_TYPES } from '../constants'
import { categoryInfo, formatYen, todayStr } from '../utils'
import { budgetService, type BudgetSettings } from '../lib/services/budgetService'
import { useSummaryCalculations } from '../hooks/useSummaryCalculations'
import MonthSwitcher from './ui/MonthSwitcher'
import { TabGroup } from './ui/TabGroup'
import { Row } from './ui/Row'
import ScreenHeader from './ui/ScreenHeader'

type BreakdownTab = 'fixed' | 'consumable' | 'oneTime'
type StorePeriod = 'monthly' | 'yearly'

interface Props {
  userId: string
  onBack: () => void
}

export default function AnalyticsScreen({ userId, onBack }: Props) {
  useEffect(() => { window.scrollTo(0, 0) }, [])

  const [budget, setBudget] = useState<BudgetSettings>({ income: 0, fixed: 0, consumable: 0, oneTimeByCategory: {} })
  const [month, setMonth] = useState(todayStr().slice(0, 7))
  const [breakdownTab, setBreakdownTab] = useState<BreakdownTab>('fixed')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [yearTransactions, setYearTransactions] = useState<Transaction[]>([])
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([])
  const [consumables, setConsumables] = useState<Consumable[]>([])
  const [householdMembers, setHouseholdMembers] = useState(1)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [storePeriod, setStorePeriod] = useState<StorePeriod>('monthly')

  const year = month.slice(0, 4)

  useEffect(() => {
    const load = async () => {
      setFetchError(null)
      try {
        const [txs, yearTxs, fixed, cons, profile, budgetSettings] = await Promise.all([
          transactionService.fetchByMonth(userId, month),
          transactionService.fetchByYear(userId, year),
          fixedExpenseService.fetchByUser(userId),
          consumableService.fetchByUser(userId),
          profileService.fetchById(userId),
          budgetService.fetchByMonth(userId, month),
        ])
        setTransactions(txs)
        setYearTransactions(yearTxs)
        setFixedExpenses(fixed)
        setConsumables(cons)
        if (profile) setHouseholdMembers(profile.household_members ?? 1)
        setBudget(budgetSettings)
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : 'データの読み込みに失敗しました')
      }
    }
    void load()
  }, [month, year, userId])

  const storeCounts = useMemo(() => {
    const source = storePeriod === 'monthly' ? transactions : yearTransactions
    const map = new Map<string, number>()
    for (const t of source) {
      if (!t.store_type) continue
      map.set(t.store_type, (map.get(t.store_type) ?? 0) + 1)
    }
    return [...map.entries()].sort(([, a], [, b]) => b - a)
  }, [storePeriod, transactions, yearTransactions])

  const {
    income,
    consumableExpense,
    oneTimeExpense,
    totalFixed,
    totalSaved,
    balance,
    oneTimeByCat,
    fixedByCat,
    consumableByCat,
    hasBreakdown,
  } = useSummaryCalculations({ transactions, fixedExpenses, consumables, householdMembers, budget, month })

  return (
    <div className="max-w-md mx-auto h-[100dvh] bg-slate-50 flex flex-col overflow-hidden">
      {/* ヘッダー */}
      <div className="bg-white border-b border-slate-100">
        <ScreenHeader title="分析" onBack={onBack} />
      </div>

      <MonthSwitcher month={month} setMonth={setMonth} />

      {fetchError && (
        <div className="mx-4 mt-3 bg-danger-50 border border-danger-200 rounded-xl px-4 py-3 text-sm text-danger-600">
          {fetchError}
        </div>
      )}

      <div className="flex-1 p-4 space-y-4 overflow-y-auto pb-8">
        {/* 収支サマリー */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-2.5">
          <div className="text-sm font-semibold text-slate-700">収支</div>
          <Row label="収入" value={formatYen(income)} valueColor="text-primary-600" />
          <Row
            label="固定費"
            value={`-${formatYen(Math.round(totalFixed))}`}
            valueColor="text-slate-500"
          />
          <Row label="定期購入" value={`-${formatYen(consumableExpense)}`} valueColor="text-danger-500" />
          <Row label="出費" value={`-${formatYen(oneTimeExpense)}`} valueColor="text-warning-500" />
          <div className="h-px bg-slate-100" />
          <Row
            label="収支"
            value={(balance >= 0 ? '+' : '') + formatYen(balance)}
            valueColor={balance >= 0 ? 'text-primary-600' : 'text-danger-500'}
            bold
          />
        </div>

        {/* 節約進捗 */}
        {totalSaved > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-700 mb-1">固定費の節約効果</div>
            <div className="text-2xl font-bold text-primary-600 mb-1">
              -{formatYen(Math.round(totalSaved))}
              <span className="text-sm font-normal text-slate-400">/月</span>
            </div>
            <div className="text-xs text-slate-400">
              累計節約 {formatYen(Math.round(totalSaved * 12))}/年換算
            </div>
          </div>
        )}

        {/* カテゴリ別内訳 */}
        {hasBreakdown ? (
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <div className="text-sm font-semibold text-slate-700">カテゴリ別内訳</div>
            <TabGroup
              tabs={[
                { key: 'fixed', label: '固定費' },
                { key: 'consumable', label: '定期購入' },
                { key: 'oneTime', label: '出費' },
              ] as { key: BreakdownTab; label: string }[]}
              active={breakdownTab}
              onChange={setBreakdownTab}
              size="sm"
            />
            {breakdownTab === 'fixed' && (
              <BreakdownBars
                entries={fixedByCat}
                total={Math.round(totalFixed)}
                barColor="bg-slate-400"
                valueColor="text-slate-600"
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
          <div className="bg-white rounded-2xl p-4 shadow-sm text-sm text-slate-400 text-center">
            この月のデータがありません
          </div>
        )}

        {/* 店舗種別の記録数 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-700">店舗種別の記録数</div>
            <div className="flex rounded-lg overflow-hidden border border-slate-200 text-xs">
              <button
                onClick={() => setStorePeriod('monthly')}
                className={`px-2.5 py-1 ${storePeriod === 'monthly' ? 'bg-slate-700 text-white' : 'bg-white text-slate-500'}`}
              >
                月間
              </button>
              <button
                onClick={() => setStorePeriod('yearly')}
                className={`px-2.5 py-1 ${storePeriod === 'yearly' ? 'bg-slate-700 text-white' : 'bg-white text-slate-500'}`}
              >
                年間
              </button>
            </div>
          </div>
          <StoreCountBars entries={storeCounts} />
        </div>
      </div>
    </div>
  )
}

// ─── Store Count Bars ───────────────────────────────────────────

function StoreCountBars({ entries }: { entries: [string, number][] }) {
  if (entries.length === 0) {
    return <div className="text-sm text-slate-400 py-1">データがありません</div>
  }
  const max = Math.max(...entries.map(([, count]) => count))
  const total = entries.reduce((s, [, count]) => s + count, 0)
  return (
    <div className="space-y-2">
      {entries.map(([storeName, count]) => {
        const info = STORE_TYPES.find((s) => s.name === storeName)
        const pct = max > 0 ? (count / max) * 100 : 0
        return (
          <div key={storeName}>
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-xs text-slate-600 flex items-center gap-1">
                <span>{info?.icon ?? '🏷️'}</span>{storeName}
              </span>
              <span className="text-xs font-semibold text-slate-600">{count}件</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-400 rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
      <div className="flex justify-between items-center pt-1 border-t border-slate-100">
        <span className="text-xs text-slate-400">合計</span>
        <span className="text-sm font-semibold text-slate-600">{total}件</span>
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
    return <div className="text-sm text-slate-400 py-1">データがありません</div>
  }
  return (
    <div className="space-y-2">
      {entries.map(([cat, amt]) => {
        const pct = total > 0 ? (amt / total) * 100 : 0
        const info = categoryInfo(cat)
        return (
          <div key={cat}>
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-xs text-slate-600 flex items-center gap-1">
                <span>{info.icon}</span>{cat}
              </span>
              <span className={`text-xs font-semibold ${valueColor}`}>-{formatYen(Math.round(amt))}</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${barColor} rounded-full transition-all`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
      <div className="flex justify-between items-center pt-1 border-t border-slate-100">
        <span className="text-xs text-slate-400">合計</span>
        <span className={`text-sm font-semibold ${valueColor}`}>-{formatYen(Math.round(total))}</span>
      </div>
    </div>
  )
}
