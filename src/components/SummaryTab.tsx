import { useEffect, useMemo, useState } from 'react'
import type { CategoryInfo } from '../constants'
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

type SubPage = 'overview' | 'detail'

const SUB_PAGE_TABS: { key: SubPage; label: string }[] = [
  { key: 'overview', label: '概要' },
  { key: 'detail', label: '詳細' },
]

interface Props {
  userId: string
  month: string
  setMonth: (m: string) => void
  fixedCategories: CategoryInfo[]
  onEditTx?: (tx: Transaction) => void
  initialSub?: SubPage
  onInitialSubConsumed?: () => void
}

export default function SummaryTab({ userId, month, setMonth, onEditTx, initialSub, onInitialSubConsumed }: Props) {
  const budget = useMemo(() => loadBudget(userId), [userId])
  const [sub, setSub] = useState<SubPage>('overview')

  useEffect(() => {
    if (initialSub) {
      setSub(initialSub)
      onInitialSubConsumed?.()
    }
  }, [initialSub]) // eslint-disable-line react-hooks/exhaustive-deps
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

      {/* 概要/詳細 切り替え */}
      <div className="px-4 pt-3">
        <TabGroup tabs={SUB_PAGE_TABS} active={sub} onChange={setSub} />
      </div>

      {fetchError && (
        <div className="mx-4 mt-3 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-600">
          {fetchError}
        </div>
      )}

      <div className="p-4 space-y-4">
        {sub === 'overview' && (
          <Overview transactions={transactions} month={month} fixedExpenses={fixedExpenses} consumables={consumables} householdMembers={householdMembers} onEditTx={onEditTx} budget={budget} />
        )}
        {sub === 'detail' && (
          <DetailView transactions={transactions} month={month} onEditTx={onEditTx} />
        )}
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
  onEditTx,
  budget,
}: {
  transactions: Transaction[]
  month: string
  fixedExpenses: FixedExpense[]
  consumables: Consumable[]
  householdMembers: number
  onEditTx?: (tx: Transaction) => void
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

  const recentTx = [...monthTx].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5)

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

      {/* 臨時出費カテゴリ別 */}
      {oneTimeByCat.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div className="text-sm font-semibold text-slate-700">臨時出費の内訳</div>
          {/* 横棒グラフ */}
          <div className="space-y-2">
            {oneTimeByCat.map(([cat, amt]) => {
              const pct = oneTimeExpense > 0 ? (amt / oneTimeExpense) * 100 : 0
              const info = categoryInfo(cat)
              return (
                <div key={cat}>
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-xs text-slate-600 flex items-center gap-1">
                      <span>{info.icon}</span>{cat}
                    </span>
                    <span className="text-xs font-semibold text-rose-500">-{formatYen(amt)}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          {/* 合計 */}
          <div className="flex justify-between items-center pt-1 border-t border-slate-100">
            <span className="text-xs text-slate-400">合計</span>
            <span className="text-sm font-semibold text-rose-500">-{formatYen(oneTimeExpense)}</span>
          </div>
        </div>
      )}

      {/* 最新5件の記録 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="text-sm font-semibold text-slate-700 mb-3">最近の記録</div>
        {recentTx.length === 0 && (
          <div className="text-sm text-slate-400 py-1">記録がありません</div>
        )}
        <div className="space-y-1.5">
          {recentTx.map((t) => {
            const info = categoryInfo(t.category)
            return (
              <button
                key={t.id}
                onClick={() => onEditTx?.(t)}
                className="w-full flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0 active:bg-slate-50 rounded-lg px-1 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{info.icon}</span>
                  <div>
                    <div className="text-sm text-slate-700">{t.category}</div>
                    <div className="text-xs text-slate-400">{t.date}</div>
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
    </>
  )
}

// ─── Detail View ─────────────────────────────────────────────

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

      {/* 絞り込みパネル */}
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
            {/* 日付ヘッダー */}
            <div className="flex justify-between items-center px-4 py-2.5 bg-slate-100 border-b border-slate-200">
              <span className="text-xs font-semibold text-slate-600">{formatDate(date)}</span>
              <div className="flex gap-2 text-xs">
                {dayIncome > 0 && <span className="text-emerald-600">+{formatYen(dayIncome)}</span>}
                {dayExpense > 0 && <span className="text-rose-400">-{formatYen(dayExpense)}</span>}
              </div>
            </div>
            {/* 明細 */}
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
