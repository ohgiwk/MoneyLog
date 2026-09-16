import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../contexts/AppContext'
import { useProfileQuery } from '../hooks/queries/useProfileQuery'
import { useBudgetQuery } from '../hooks/queries/useBudgetQuery'
import { useFixedExpensesQuery } from '../hooks/queries/useFixedExpensesQuery'
import { useConsumablesQuery } from '../hooks/queries/useConsumablesQuery'
import { useTransactionsQuery } from '../hooks/queries/useTransactionsQuery'
import { calendarEventService } from '../lib/services/calendarEventService'
import { useQuery } from '@tanstack/react-query'
import {
  formatDateWithWeekday,
  formatYen,
  periodDayCount,
  periodDayIndex,
  periodKey,
  todayStr,
} from '../utils'
import { oneTimeBudgetTotal, EMPTY_BUDGET_SETTINGS } from '../lib/services/budgetService'
import { useSummaryCalculations } from '../hooks/useSummaryCalculations'
import BudgetProgressPanel, { type PeriodMode } from './BudgetProgressPanel'
import { Row } from './ui/Row'
import Button from './ui/Button'
import ErrorBanner from './ui/ErrorBanner'
import { FETCH_ERROR_MSG } from '../constants'

interface Props {
  userId: string
}

const allowanceModeKey = (userId: string) => `allowanceMode_${userId}`

type AllowanceMode = 'cumulative' | 'remaining'

export default function HomeTab({ userId }: Props) {
  const navigate = useNavigate()
  const { setCalendarSelectedDate, setMonth, categories } = useAppContext()
  const { expenseCategories } = categories
  const [allowanceMode, setAllowanceMode] = useState<AllowanceMode>(() => {
    const stored = localStorage.getItem(allowanceModeKey(userId))
    if (stored === 'cumulative' || stored === 'remaining') return stored
    // 旧設定（carryOver）からの移行: ON → cumulative
    return 'cumulative'
  })
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [periodMode, setPeriodMode] = useState<PeriodMode>('month')
  const [infoOpen, setInfoOpen] = useState(false)

  const today = todayStr()
  const calendarMonth = today.slice(0, 7)

  const { data: profile, isError: profileError } = useProfileQuery(userId)
  const monthStartDay = profile?.month_start_day ?? 1
  const householdMembers = profile?.household_members ?? 1
  const period = periodKey(today, monthStartDay)

  const { data: transactions = [], isError: txError } = useTransactionsQuery(
    userId,
    period,
    monthStartDay
  )
  const { data: budgetMonthTx = [], isError: budgetTxError } = useTransactionsQuery(
    userId,
    calendarMonth
  )
  const { data: fixedExpenses = [], isError: fixedError } = useFixedExpensesQuery(userId)
  const { data: consumables = [], isError: consumablesError } = useConsumablesQuery(userId)
  const { data: budget = EMPTY_BUDGET_SETTINGS, isError: budgetError } = useBudgetQuery(
    userId,
    calendarMonth
  )
  const { data: upcomingEvents = [], isError: upcomingError } = useQuery({
    queryKey: ['calendarEvents', 'upcoming', userId, today],
    queryFn: () => calendarEventService.fetchUpcomingExpenses(userId, today),
    enabled: !!userId,
  })

  const fetchError =
    profileError ||
    txError ||
    budgetTxError ||
    fixedError ||
    consumablesError ||
    budgetError ||
    upcomingError
      ? FETCH_ERROR_MSG
      : null

  function handleAllowanceModeChange(mode: AllowanceMode) {
    setAllowanceMode(mode)
    localStorage.setItem(allowanceModeKey(userId), mode)
  }

  const dailyBudgetTotal = oneTimeBudgetTotal(budget)

  const daysInMonth = useMemo(() => periodDayCount(period, monthStartDay), [period, monthStartDay])

  const dailyAllowance = dailyBudgetTotal / daysInMonth

  const dayOfMonth = periodDayIndex(today, period, monthStartDay)

  const monthToDateExpense = useMemo(
    () =>
      transactions
        .filter((t) => t.date <= today && t.type === 'expense' && t.expense_kind === 'one_time')
        .reduce((s, t) => s + t.amount, 0),
    [transactions, today]
  )

  const remainingDays = daysInMonth - dayOfMonth + 1
  const todayAllowance =
    allowanceMode === 'cumulative'
      ? dailyAllowance * dayOfMonth - monthToDateExpense
      : remainingDays > 0
        ? (dailyBudgetTotal - monthToDateExpense) / remainingDays
        : dailyBudgetTotal - monthToDateExpense

  const {
    hasBudget,
    weekRange,
    daysInMonth: budgetDaysInMonth,
    oneTimeCategoryRows,
    income,
    totalFixed,
    savings,
    oneTimeExpense,
    balance,
  } = useSummaryCalculations({
    transactions: budgetMonthTx,
    fixedExpenses,
    consumables,
    householdMembers,
    budget,
    month: calendarMonth,
  })

  const catOrder = useMemo(
    () => new Map(expenseCategories.map((c, i) => [c.name, i])),
    [expenseCategories]
  )
  const sortedCategoryRows = useMemo(
    () =>
      [...oneTimeCategoryRows].sort(
        (a, b) => (catOrder.get(a.cat) ?? Infinity) - (catOrder.get(b.cat) ?? Infinity)
      ),
    [oneTimeCategoryRows, catOrder]
  )

  const [categoryMode] = useState(
    () => localStorage.getItem(`budgetCategoryMode_${userId}`) ?? 'detail'
  )
  const displayCategoryRows =
    categoryMode === 'total' && sortedCategoryRows.length > 0
      ? [
          {
            cat: '通常出費',
            icon: '⚡',
            spent: sortedCategoryRows.reduce((s, r) => s + r.spent, 0),
            weekBudget: sortedCategoryRows.reduce((s, r) => s + r.weekBudget, 0),
            daySpent: sortedCategoryRows.reduce((s, r) => s + r.daySpent, 0),
            dayBudget: sortedCategoryRows.reduce((s, r) => s + r.dayBudget, 0),
            monthSpent: sortedCategoryRows.reduce((s, r) => s + r.monthSpent, 0),
            monthBudget: sortedCategoryRows.reduce((s, r) => s + r.monthBudget, 0),
          },
        ]
      : sortedCategoryRows

  return (
    <div className="p-4 space-y-4">
      <ErrorBanner message={fetchError} />

      <div className="relative bg-surface rounded-2xl shadow-sm overflow-hidden">
        {/* 上部：お小遣い表示 */}
        <div className="p-6 text-center space-y-4">
          <button
            type="button"
            aria-label="オプション"
            onClick={() => setOptionsOpen((v) => !v)}
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full text-ink-muted active:bg-surface-hover"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
              <circle cx="8" cy="7" r="2.5" fill="currentColor" />
              <line
                x1="2"
                y1="7"
                x2="5.5"
                y2="7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <line
                x1="10.5"
                y1="7"
                x2="22"
                y2="7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="16" cy="12" r="2.5" fill="currentColor" />
              <line
                x1="2"
                y1="12"
                x2="13.5"
                y2="12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <line
                x1="18.5"
                y1="12"
                x2="22"
                y2="12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="10" cy="17" r="2.5" fill="currentColor" />
              <line
                x1="2"
                y1="17"
                x2="7.5"
                y2="17"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <line
                x1="12.5"
                y1="17"
                x2="22"
                y2="17"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>

          {optionsOpen && (
            <>
              <button
                type="button"
                aria-label="閉じる"
                className="fixed inset-0 z-10 cursor-default"
                onClick={() => setOptionsOpen(false)}
              />
              <div className="absolute top-12 right-3 z-20 bg-surface rounded-xl shadow-lg border border-line-subtle px-4 py-3 text-left space-y-2">
                <div className="text-xs text-ink-muted font-medium">計算方式</div>
                <div className="flex flex-col gap-1.5">
                  {(
                    [
                      {
                        mode: 'cumulative',
                        label: '日割り累計',
                        formula: '日割り×経過日数－累計出費',
                        desc: '計画ペースとのズレを把握できます。使いすぎるとマイナスになります。',
                      },
                      {
                        mode: 'remaining',
                        label: '残額割り',
                        formula: '(予算－累計出費)÷残り日数',
                        desc: '今日使える金額の目安がわかります。使いすぎた分が自動的に翌日以降に分散されます。',
                      },
                    ] as const
                  ).map(({ mode, label, formula, desc }) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        handleAllowanceModeChange(mode)
                        setOptionsOpen(false)
                      }}
                      className={`flex items-start gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                        allowanceMode === mode
                          ? 'bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-400'
                          : 'text-ink active:bg-surface-subtle'
                      }`}
                    >
                      <span
                        className={`mt-0.5 w-3.5 h-3.5 rounded-full border-2 shrink-0 ${
                          allowanceMode === mode
                            ? 'border-primary-500 bg-primary-500'
                            : 'border-line-subtle'
                        }`}
                      />
                      <span>
                        <span className="font-medium">{label}</span>
                        <span className="block text-xs text-ink-muted font-normal">{formula}</span>
                        <span className="block text-xs text-ink-muted font-normal mt-0.5">
                          {desc}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="text-sm font-semibold text-ink-muted">本日のお小遣い</div>
          <div className="relative flex items-center justify-center gap-1.5">
            <div
              className={`text-4xl font-bold ${todayAllowance >= 0 ? 'text-income-600' : 'text-danger-500'}`}
            >
              {formatYen(todayAllowance)}
            </div>
            <button
              type="button"
              aria-label="本日のお小遣いの説明"
              onClick={() => setInfoOpen((v) => !v)}
              className="w-5 h-5 flex items-center justify-center rounded-full text-ink-subtle active:text-ink-muted"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
                <line
                  x1="12"
                  y1="11"
                  x2="12"
                  y2="17"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <circle cx="12" cy="8" r="1" fill="currentColor" />
              </svg>
            </button>

            {infoOpen && (
              <>
                <button
                  type="button"
                  aria-label="閉じる"
                  className="fixed inset-0 z-10 cursor-default"
                  onClick={() => setInfoOpen(false)}
                />
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-20 w-72 max-w-[85vw] bg-surface rounded-xl shadow-lg border border-line-subtle px-4 py-3 text-left space-y-2">
                  <div className="text-sm font-semibold text-ink">本日のお小遣いとは</div>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    {allowanceMode === 'cumulative'
                      ? '予算の日割り額×経過日数から今月の累計出費を引いた金額です。'
                      : '月の残り予算を今日を含む残り日数で割った金額です。'}
                  </p>
                  <table className="w-full text-xs text-ink-muted border-t border-line-subtle pt-2">
                    <tbody>
                      {allowanceMode === 'cumulative' ? (
                        <>
                          <tr>
                            <td className="text-left py-0.5">日割り予算</td>
                            <td className="text-right py-0.5">{formatYen(dailyAllowance)}</td>
                          </tr>
                          <tr>
                            <td className="text-left py-0.5">経過日数（{dayOfMonth}日分）</td>
                            <td className="text-right py-0.5">
                              {formatYen(Math.round(dailyAllowance * dayOfMonth))}
                            </td>
                          </tr>
                          <tr>
                            <td className="text-left py-0.5">今月の出費</td>
                            <td className="text-right py-0.5">− {formatYen(monthToDateExpense)}</td>
                          </tr>
                        </>
                      ) : (
                        <>
                          <tr>
                            <td className="text-left py-0.5">月の予算</td>
                            <td className="text-right py-0.5">{formatYen(dailyBudgetTotal)}</td>
                          </tr>
                          <tr>
                            <td className="text-left py-0.5">今月の出費</td>
                            <td className="text-right py-0.5">− {formatYen(monthToDateExpense)}</td>
                          </tr>
                          <tr>
                            <td className="text-left py-0.5">残り日数（{remainingDays}日）</td>
                            <td className="text-right py-0.5">÷ {remainingDays}</td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                  {(() => {
                    const futureCount = Math.min(daysInMonth - dayOfMonth, 5)
                    if (futureCount === 0) return null
                    return (
                      <div className="text-xs text-ink-muted bg-surface-subtle rounded-lg px-3 py-2 space-y-1">
                        <div className="font-medium text-ink-muted mb-1">
                          {allowanceMode === 'cumulative'
                            ? '今後のお小遣い予測（出費なしの場合）'
                            : '今後のお小遣い予測（追加出費なしの場合）'}
                        </div>
                        {Array.from({ length: futureCount }, (_, i) => {
                          const n = i + 1
                          const futureDays = remainingDays - n
                          const future =
                            allowanceMode === 'cumulative'
                              ? Math.round(dailyAllowance * (dayOfMonth + n) - monthToDateExpense)
                              : futureDays > 0
                                ? Math.round((dailyBudgetTotal - monthToDateExpense) / futureDays)
                                : dailyBudgetTotal - monthToDateExpense
                          return (
                            <div key={n} className="flex justify-between">
                              <span>{n}日後</span>
                              <span className={future >= 0 ? 'text-income-600' : 'text-danger-500'}>
                                {formatYen(future)}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}
                </div>
              </>
            )}
          </div>
          <div className="!mt-1">
            <div className="text-sm font-bold text-danger-500 text-center">
              残り{daysInMonth - dayOfMonth + 1}日
            </div>
          </div>
        </div>

        {/* 下部：予算進捗（統合） */}
        <div className="border-t border-line-subtle">
          <BudgetProgressPanel
            naked
            periodMode={periodMode}
            setPeriodMode={setPeriodMode}
            weekRange={weekRange}
            daysInMonth={budgetDaysInMonth}
            month={calendarMonth}
            oneTimeCategoryRows={displayCategoryRows}
            hasBudget={hasBudget}
            onManageBudget={() => navigate('/budget')}
            onCategoryClick={(cat) =>
              navigate('/expense-filter', { state: { categoryFilter: cat } })
            }
          />
        </div>
      </div>

      <div className="bg-surface rounded-2xl p-4 shadow-sm space-y-2.5">
        <div className="text-sm font-semibold text-ink">収支</div>
        <Row label="収入" value={formatYen(income)} valueColor="text-income-600" />
        <Row label="貯蓄" value={`-${formatYen(savings)}`} valueColor="text-ink-muted" />
        <Row
          label="固定費"
          value={`-${formatYen(Math.round(totalFixed))}`}
          valueColor="text-danger-500"
        />
        <Row label="出費" value={`-${formatYen(oneTimeExpense)}`} valueColor="text-danger-500" />
        <div className="h-px bg-surface-hover" />
        <Row
          label="収支"
          value={(balance >= 0 ? '+' : '') + formatYen(balance)}
          valueColor={balance >= 0 ? 'text-income-600' : 'text-danger-500'}
          bold
        />
        <Button variant="secondary" fullWidth size="sm" onClick={() => navigate('/analytics')}>
          レポートを確認
        </Button>
      </div>

      <div className="bg-surface rounded-2xl p-6 shadow-sm space-y-3">
        <div className="text-sm font-semibold text-ink-muted">今後の出費予定</div>
        {upcomingEvents.length === 0 ? (
          <div className="text-sm text-ink-muted">なし</div>
        ) : (
          <div className="space-y-4">
            {(() => {
              const groups = upcomingEvents.reduce<
                Record<string, { total: number; events: typeof upcomingEvents }>
              >((acc, event) => {
                const month = event.date.slice(0, 7)
                if (!acc[month]) acc[month] = { total: 0, events: [] }
                acc[month].total += event.planned_expense
                acc[month].events.push(event)
                return acc
              }, {})
              return Object.entries(groups).map(([month, { total, events }], i) => {
                const [y, m] = month.split('-')
                const label = `${y}年${Number(m)}月`
                return (
                  <div key={month}>
                    {i > 0 && <div className="h-px bg-line-subtle mb-3" />}
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-ink-muted tracking-wide">
                        {label}
                      </span>
                      <span className="text-xs font-bold text-danger-500">{formatYen(total)}</span>
                    </div>
                    <ul className="divide-y divide-line-subtle">
                      {events.map((event) => (
                        <li key={event.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setMonth(event.date.slice(0, 7))
                              setCalendarSelectedDate(event.date)
                              navigate('/calendar')
                            }}
                            className="w-full flex items-center justify-between py-2 text-sm text-left active:bg-surface-subtle"
                          >
                            <div className="flex flex-col">
                              <span className="text-ink">{event.title}</span>
                              <span className="text-xs text-ink-muted">
                                {formatDateWithWeekday(event.date)}
                              </span>
                            </div>
                            <span className="font-semibold text-ink">
                              {formatYen(event.planned_expense)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })
            })()}
          </div>
        )}
      </div>
    </div>
  )
}
