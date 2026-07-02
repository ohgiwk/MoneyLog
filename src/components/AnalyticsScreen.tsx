import { useEffect, useMemo, useState } from 'react'
import { transactionService } from '../lib/services/transactionService'
import { fixedExpenseService } from '../lib/services/fixedExpenseService'
import { consumableService } from '../lib/services/consumableService'
import { profileService } from '../lib/services/profileService'
import type { Consumable, FixedExpense, Transaction } from '../lib/database.types'
import { categoryInfo, formatYen, todayStr } from '../utils'
import { loadBudget } from '../lib/budgetStorage'
import { useSummaryCalculations } from '../hooks/useSummaryCalculations'
import MonthSwitcher from './ui/MonthSwitcher'
import { TabGroup } from './ui/TabGroup'
import { Row } from './ui/Row'

type BreakdownTab = 'fixed' | 'consumable' | 'oneTime'
type PeriodMode = 'day' | 'week' | 'month'

interface Props {
  userId: string
  onBack: () => void
}

export default function AnalyticsScreen({ userId, onBack }: Props) {
  useEffect(() => { window.scrollTo(0, 0) }, [])

  const budget = useMemo(() => loadBudget(userId), [userId])
  const [month, setMonth] = useState(todayStr().slice(0, 7))
  const [breakdownTab, setBreakdownTab] = useState<BreakdownTab>('fixed')
  const [periodMode, setPeriodMode] = useState<PeriodMode>('week')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([])
  const [consumables, setConsumables] = useState<Consumable[]>([])
  const [householdMembers, setHouseholdMembers] = useState(1)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setFetchError(null)
      try {
        const [txs, fixed, cons, profile] = await Promise.all([
          transactionService.fetchByMonth(userId, month),
          fixedExpenseService.fetchByUser(userId),
          consumableService.fetchByUser(userId),
          profileService.fetchById(userId),
        ])
        setTransactions(txs)
        setFixedExpenses(fixed)
        setConsumables(cons)
        if (profile) setHouseholdMembers(profile.household_members ?? 1)
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : 'データの読み込みに失敗しました')
      }
    }
    void load()
  }, [month, userId])

  const {
    income,
    consumableExpense,
    oneTimeExpense,
    totalFixed,
    totalSaved,
    balance,
    weekRange,
    dayRange,
    daysInMonth,
    hasBudget,
    oneTimeCategoryRows,
    oneTimeByCat,
    fixedByCat,
    consumableByCat,
    hasBreakdown,
  } = useSummaryCalculations({ transactions, fixedExpenses, consumables, householdMembers, budget, month })

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
        <span className="font-semibold text-slate-800">分析</span>
      </div>

      <MonthSwitcher month={month} setMonth={setMonth} />

      {fetchError && (
        <div className="mx-4 mt-3 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-600">
          {fetchError}
        </div>
      )}

      <div className="flex-1 p-4 space-y-4 overflow-y-auto pb-8">
        {/* 収支サマリー */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-2.5">
          <div className="text-sm font-semibold text-slate-700">収支</div>
          <Row label="収入" value={formatYen(income)} valueColor="text-emerald-600" />
          <Row
            label="固定費"
            value={`-${formatYen(Math.round(totalFixed))}`}
            valueColor="text-slate-500"
          />
          <Row label="定期購入" value={`-${formatYen(consumableExpense)}`} valueColor="text-rose-500" />
          <Row label="出費" value={`-${formatYen(oneTimeExpense)}`} valueColor="text-amber-500" />
          <div className="h-px bg-slate-100" />
          <Row
            label="収支"
            value={(balance >= 0 ? '+' : '') + formatYen(balance)}
            valueColor={balance >= 0 ? 'text-emerald-600' : 'text-rose-500'}
            bold
          />
        </div>

        {/* 予算進捗 */}
        {hasBudget && (
          <BudgetProgressPanel
            periodMode={periodMode}
            setPeriodMode={setPeriodMode}
            weekRange={weekRange}
            dayRange={dayRange}
            daysInMonth={daysInMonth}
            month={month}
            oneTimeCategoryRows={oneTimeCategoryRows}
          />
        )}

        {/* 節約進捗 */}
        {totalSaved > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-700 mb-1">固定費の節約効果</div>
            <div className="text-2xl font-bold text-emerald-600 mb-1">
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
            <div className="text-sm font-semibold text-slate-700">内訳</div>
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
                barColor="bg-amber-400"
                valueColor="text-amber-600"
              />
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-4 shadow-sm text-sm text-slate-400 text-center">
            この月のデータがありません
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Budget Progress Panel ───────────────────────────────────

function BudgetProgressPanel({
  periodMode,
  setPeriodMode,
  weekRange,
  dayRange,
  daysInMonth,
  month,
  oneTimeCategoryRows,
}: {
  periodMode: PeriodMode
  setPeriodMode: (m: PeriodMode) => void
  weekRange: { start: string; end: string }
  dayRange: { start: string; end: string }
  daysInMonth: number
  month: string
  oneTimeCategoryRows: {
    cat: string
    icon: string
    spent: number
    weekBudget: number
    daySpent: number
    dayBudget: number
    monthSpent: number
    monthBudget: number
  }[]
}) {
  const today = new Date()

  // 期間ラベルと進捗率
  const { rangeLabel, filledDots, totalDots, periodLabel } = useMemo(() => {
    if (periodMode === 'day') {
      const d = dayRange.start
      const label = d.slice(5).replace('-', '/')
      const hours = today.getHours()
      return {
        rangeLabel: label,
        filledDots: hours,
        totalDots: 24,
        periodLabel: `${today.getHours()}:${String(today.getMinutes()).padStart(2, '0')} / 24:00`,
      }
    }
    if (periodMode === 'week') {
      const label = `${weekRange.start.slice(5).replace('-', '/')} 〜 ${weekRange.end.slice(5).replace('-', '/')}`
      const dow = (today.getDay() + 6) % 7 // 0=Mon
      return {
        rangeLabel: label,
        filledDots: dow,
        totalDots: 7,
        periodLabel: `${dow + 1}日目 / 7日`,
      }
    }
    // month
    const [y, m] = month.split('-').map(Number)
    const label = `${y}/${String(m).padStart(2, '0')}`
    const dayOfMonth = today.getDate()
    return {
      rangeLabel: label,
      filledDots: dayOfMonth - 1,
      totalDots: daysInMonth,
      periodLabel: `${dayOfMonth}日 / ${daysInMonth}日`,
    }
  }, [periodMode, dayRange, weekRange, month, daysInMonth, today])

  const rows = oneTimeCategoryRows.map((r) => {
    if (periodMode === 'day') return { ...r, spent: r.daySpent, budget: r.dayBudget }
    if (periodMode === 'week') return { ...r, spent: r.spent, budget: r.weekBudget }
    return { ...r, spent: r.monthSpent, budget: r.monthBudget }
  })

  const modeLabel = periodMode === 'day' ? '日割り' : periodMode === 'week' ? '週割り' : '月'

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
      {/* ヘッダー行 */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-700">{modeLabel}予算進捗</div>
        <div className="flex rounded-lg overflow-hidden border border-slate-200 text-xs">
          {(['day', 'week', 'month'] as PeriodMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setPeriodMode(m)}
              className={`px-2 py-1 ${periodMode === m ? 'bg-slate-700 text-white' : 'bg-white text-slate-500'}`}
            >
              {m === 'day' ? '日' : m === 'week' ? '週' : '月'}
            </button>
          ))}
        </div>
      </div>

      {/* 期間進捗バー */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-slate-400">{rangeLabel}</span>
          <span className="text-xs text-slate-400">{periodLabel}</span>
        </div>
        <div className="flex gap-[3px] items-center">
          {Array.from({ length: totalDots }).map((_, i) => (
            <div
              key={i}
              className={`rounded-full flex-1 h-2 ${i < filledDots ? 'bg-slate-400' : 'bg-slate-100'}`}
            />
          ))}
        </div>
      </div>

      <div className="h-px bg-slate-100" />

      {/* カテゴリ別予算進捗 */}
      {rows.length > 0 && rows.map(({ cat, icon, spent, budget }) => (
        <BudgetProgress
          key={cat}
          label={cat}
          icon={icon}
          spent={spent}
          budget={budget}
          color="bg-amber-400"
        />
      ))}
    </div>
  )
}

// ─── Budget Progress Bar ──────────────────────────────────────

function BudgetProgress({
  label,
  icon,
  spent,
  budget,
  color,
}: {
  label: string
  icon: string
  spent: number
  budget: number
  color: string
}) {
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0
  const over = spent > budget && budget > 0
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-slate-600 flex items-center gap-1">
          <span>{icon}</span>
          {label}
        </span>
        <span className="text-xs text-slate-500">
          <span className={over ? 'text-rose-500 font-semibold' : 'font-medium'}>
            {formatYen(spent)}
          </span>
          {' / '}
          <span className="text-slate-400">{formatYen(budget)}</span>
        </span>
      </div>
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${over ? 'bg-rose-400' : color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {over && (
        <div className="text-xs text-rose-500 mt-0.5 text-right">
          {formatYen(spent - budget)} オーバー
        </div>
      )}
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
