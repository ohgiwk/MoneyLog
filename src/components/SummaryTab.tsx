import { useEffect, useMemo, useState } from 'react'
import { transactionService } from '../lib/services/transactionService'
import { fixedExpenseService } from '../lib/services/fixedExpenseService'
import { consumableService } from '../lib/services/consumableService'
import { profileService } from '../lib/services/profileService'
import type { Consumable, FixedExpense, Transaction } from '../lib/database.types'
import { categoryInfo, formatYen, monthKey, monthlyConsumableCost } from '../utils'
import { loadBudget, oneTimeBudgetTotal } from '../lib/budgetStorage'
import MonthSwitcher from './ui/MonthSwitcher'
import { TabGroup } from './ui/TabGroup'
import { Row } from './ui/Row'

type BreakdownTab = 'fixed' | 'consumable' | 'oneTime'

interface Props {
  userId: string
  month: string
  setMonth: (m: string) => void
}

export default function SummaryTab({ userId, month, setMonth }: Props) {
  const budget = useMemo(() => loadBudget(userId), [userId])
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

  return (
    <div>
      <MonthSwitcher month={month} setMonth={setMonth} />

      {fetchError && (
        <div className="mx-4 mt-3 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-600">
          {fetchError}
        </div>
      )}

      <div className="p-4 space-y-4">
        <Overview transactions={transactions} month={month} fixedExpenses={fixedExpenses} consumables={consumables} householdMembers={householdMembers} budget={budget} />
      </div>
    </div>
  )
}

// ─── Overview ───────────────────────────────────────────────

function Overview({
  transactions,
  month,
  fixedExpenses,
  consumables,
  householdMembers,
  budget,
}: {
  transactions: Transaction[]
  month: string
  fixedExpenses: FixedExpense[]
  consumables: Consumable[]
  householdMembers: number
  budget: ReturnType<typeof loadBudget>
}) {
  const monthTx = useMemo(
    () => transactions.filter((t) => monthKey(t.date) === month),
    [transactions, month]
  )
  const income = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const consumableExpense = Math.round(
    consumables.reduce((s, c) => s + monthlyConsumableCost(c, householdMembers), 0)
  )
  const oneTimeExpense = monthTx
    .filter((t) => t.type === 'expense' && t.expense_kind === 'one_time')
    .reduce((s, t) => s + t.amount, 0)

  const activeFixed = fixedExpenses.filter((f) => f.status === 'active' || f.status === 'reviewing')
  const toMonthly = (f: FixedExpense) => (f.amount ?? 0) / (f.cycle === 'yearly' ? 12 : 1)
  const totalFixed = activeFixed.reduce((s, f) => s + toMonthly(f), 0)
  const totalBaseline = activeFixed.reduce(
    (s, f) => s + f.baseline_amount / (f.cycle === 'yearly' ? 12 : 1),
    0
  )
  const totalSaved = totalBaseline - totalFixed

  const totalExpense = consumableExpense + oneTimeExpense
  const balance = income - totalFixed - totalExpense

  // 今週（月曜始まり）の日付範囲
  const weekRange = useMemo(() => {
    const today = new Date()
    const dow = (today.getDay() + 6) % 7 // 0=Mon
    const mon = new Date(today)
    mon.setDate(today.getDate() - dow)
    const sun = new Date(mon)
    sun.setDate(mon.getDate() + 6)
    const fmt = (d: Date) => d.toISOString().slice(0, 10)
    return { start: fmt(mon), end: fmt(sun) }
  }, [])

  const thisWeekTx = useMemo(
    () => transactions.filter((t) => t.date >= weekRange.start && t.date <= weekRange.end),
    [transactions, weekRange]
  )

  // 臨時出費：カテゴリ別に今週の支出を集計
  const weekOneTimeByCat = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of thisWeekTx) {
      if (t.type !== 'expense' || t.expense_kind !== 'one_time') continue
      map.set(t.category, (map.get(t.category) ?? 0) + t.amount)
    }
    return map
  }, [thisWeekTx])

  const hasBudget = oneTimeBudgetTotal(budget) > 0 || weekOneTimeByCat.size > 0

  // カテゴリ別週次予算（設定あるもの、または今週支出あるもの）
  const oneTimeCategoryRows = useMemo(() => {
    const cats = new Set([
      ...Object.keys(budget.oneTimeByCategory).filter((c) => (budget.oneTimeByCategory[c] ?? 0) > 0),
      ...[...weekOneTimeByCat.keys()],
    ])
    return [...cats].map((cat) => ({
      cat,
      spent: weekOneTimeByCat.get(cat) ?? 0,
      weekBudget: Math.round((budget.oneTimeByCategory[cat] ?? 0) / 4.33),
    }))
  }, [budget.oneTimeByCategory, weekOneTimeByCat])

  const oneTimeByCat = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of monthTx) {
      if (t.type !== 'expense' || t.expense_kind !== 'one_time') continue
      map.set(t.category, (map.get(t.category) ?? 0) + t.amount)
    }
    return [...map.entries()].sort(([, a], [, b]) => b - a)
  }, [monthTx])

  const fixedByCat = useMemo(() => {
    const map = new Map<string, number>()
    for (const f of activeFixed) {
      const amt = toMonthly(f)
      map.set(f.category, (map.get(f.category) ?? 0) + amt)
    }
    return [...map.entries()].sort(([, a], [, b]) => b - a)
  }, [activeFixed])

  const consumableByCat = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of consumables) {
      const amt = monthlyConsumableCost(c, householdMembers)
      map.set(c.category, (map.get(c.category) ?? 0) + amt)
    }
    return [...map.entries()].sort(([, a], [, b]) => b - a)
  }, [consumables, householdMembers])

  const hasBreakdown = fixedByCat.length > 0 || consumableByCat.length > 0 || oneTimeByCat.length > 0

  const [breakdownTab, setBreakdownTab] = useState<BreakdownTab>('fixed')

  return (
    <>
      {/* 収支サマリー */}
      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-2.5">
        <div className="text-sm font-semibold text-slate-700">収支</div>
        <Row label="収入" value={formatYen(income)} valueColor="text-emerald-600" />
        <Row
          label="固定費"
          value={`-${formatYen(Math.round(totalFixed))}`}
          valueColor="text-slate-500"
        />
        <Row label="消耗品費" value={`-${formatYen(consumableExpense)}`} valueColor="text-rose-500" />
        <Row label="臨時出費" value={`-${formatYen(oneTimeExpense)}`} valueColor="text-amber-500" />
        <div className="h-px bg-slate-100" />
        <Row
          label="収支"
          value={(balance >= 0 ? '+' : '') + formatYen(balance)}
          valueColor={balance >= 0 ? 'text-emerald-600' : 'text-rose-500'}
          bold
        />
      </div>

      {/* 今週の予算進捗 */}
      {hasBudget && (
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div className="text-sm font-semibold text-slate-700">今週の予算進捗</div>
          <div className="text-xs text-slate-400 -mt-1">
            {weekRange.start.slice(5).replace('-', '/')} 〜 {weekRange.end.slice(5).replace('-', '/')}
          </div>
          {oneTimeCategoryRows.length > 0 && (
            <>
              {oneTimeCategoryRows.map(({ cat, spent, weekBudget }) => {
                const info = categoryInfo(cat)
                return (
                  <BudgetProgress
                    key={cat}
                    label={cat}
                    icon={info.icon}
                    spent={spent}
                    weekBudget={weekBudget}
                    color="bg-amber-400"
                  />
                )
              })}
            </>
          )}
        </div>
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

      {/* カテゴリ別内訳（タブ切り替え） */}
      {hasBreakdown && (
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div className="text-sm font-semibold text-slate-700">内訳</div>
          {/* タブ */}
          <TabGroup
            tabs={[
              { key: 'fixed', label: '固定費' },
              { key: 'consumable', label: '消耗品費' },
              { key: 'oneTime', label: '臨時出費' },
            ] as { key: BreakdownTab; label: string }[]}
            active={breakdownTab}
            onChange={setBreakdownTab}
            size="sm"
          />
          {/* 固定費内訳 */}
          {breakdownTab === 'fixed' && (
            <BreakdownBars
              entries={fixedByCat}
              total={Math.round(totalFixed)}
              barColor="bg-slate-400"
              valueColor="text-slate-600"
            />
          )}
          {/* 消耗品費内訳 */}
          {breakdownTab === 'consumable' && (
            <BreakdownBars
              entries={consumableByCat}
              total={consumableExpense}
              barColor="bg-blue-400"
              valueColor="text-blue-600"
            />
          )}
          {/* 臨時出費内訳 */}
          {breakdownTab === 'oneTime' && (
            <BreakdownBars
              entries={oneTimeByCat}
              total={oneTimeExpense}
              barColor="bg-amber-400"
              valueColor="text-amber-600"
            />
          )}
        </div>
      )}

    </>
  )
}

// ─── Budget Progress Bar ──────────────────────────────────────

function BudgetProgress({
  label,
  icon,
  spent,
  weekBudget,
  color,
}: {
  label: string
  icon: string
  spent: number
  weekBudget: number
  color: string
}) {
  const pct = weekBudget > 0 ? Math.min((spent / weekBudget) * 100, 100) : 0
  const over = spent > weekBudget && weekBudget > 0
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
          <span className="text-slate-400">{formatYen(weekBudget)}</span>
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
          {formatYen(spent - weekBudget)} オーバー
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
