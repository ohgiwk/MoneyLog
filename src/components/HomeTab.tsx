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

interface Props {
  userId: string
}

const carryOverKey = (userId: string) => `pocketMoneyCarryOver_${userId}`

export default function HomeTab({ userId }: Props) {
  const navigate = useNavigate()
  const { setCalendarSelectedDate, setMonth } = useAppContext()
  const [carryOver, setCarryOver] = useState(() => {
    const stored = localStorage.getItem(carryOverKey(userId))
    return stored === null ? true : stored === 'true'
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
      ? 'データの読み込みに失敗しました'
      : null

  function handleCarryOverChange(next: boolean) {
    setCarryOver(next)
    localStorage.setItem(carryOverKey(userId), String(next))
  }

  const dailyBudgetTotal = oneTimeBudgetTotal(budget)

  const daysInMonth = useMemo(() => periodDayCount(period, monthStartDay), [period, monthStartDay])

  const dailyAllowance = dailyBudgetTotal / daysInMonth

  const oneTimeExpenseOn = (dateStr: string) =>
    transactions
      .filter((t) => t.date === dateStr && t.type === 'expense' && t.expense_kind === 'one_time')
      .reduce((s, t) => s + t.amount, 0)

  const todayExpense = oneTimeExpenseOn(today)

  const dayOfMonth = periodDayIndex(today, period, monthStartDay)

  const monthToDateExpense = useMemo(
    () =>
      transactions
        .filter((t) => t.date <= today && t.type === 'expense' && t.expense_kind === 'one_time')
        .reduce((s, t) => s + t.amount, 0),
    [transactions, today]
  )

  const todayAllowance = carryOver
    ? dailyAllowance * dayOfMonth - monthToDateExpense
    : dailyAllowance - todayExpense

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

  const categoryMode = localStorage.getItem(`budgetCategoryMode_${userId}`) ?? 'detail'
  const displayCategoryRows =
    categoryMode === 'total' && oneTimeCategoryRows.length > 0
      ? [
          {
            cat: '通常出費',
            icon: '⚡',
            spent: oneTimeCategoryRows.reduce((s, r) => s + r.spent, 0),
            weekBudget: oneTimeCategoryRows.reduce((s, r) => s + r.weekBudget, 0),
            daySpent: oneTimeCategoryRows.reduce((s, r) => s + r.daySpent, 0),
            dayBudget: oneTimeCategoryRows.reduce((s, r) => s + r.dayBudget, 0),
            monthSpent: oneTimeCategoryRows.reduce((s, r) => s + r.monthSpent, 0),
            monthBudget: oneTimeCategoryRows.reduce((s, r) => s + r.monthBudget, 0),
          },
        ]
      : oneTimeCategoryRows

  return (
    <div className="p-4 space-y-4">
      {fetchError && (
        <div className="bg-danger-50 border border-danger-200 rounded-xl px-4 py-3 text-sm text-danger-600">
          {fetchError}
        </div>
      )}

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
              <div className="absolute top-12 right-3 z-20 bg-surface rounded-xl shadow-lg border border-line-subtle px-4 py-3 text-left">
                <div className="flex items-center gap-3 whitespace-nowrap">
                  <span className="text-sm text-ink">お小遣い繰り越し</span>
                  <button
                    role="switch"
                    aria-checked={carryOver}
                    onClick={() => handleCarryOverChange(!carryOver)}
                    className={`w-11 h-6 rounded-full transition-colors relative ${
                      carryOver ? 'bg-primary-500' : 'bg-surface-muted'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-surface rounded-full shadow transition-transform ${
                        carryOver ? 'translate-x-5' : ''
                      }`}
                    />
                  </button>
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
                    予算に設定した金額を元に、月の日数で日割りした金額です。繰り越しをONにすると、日々のお小遣いが繰り越されて、本日のお小遣いとなります。
                  </p>
                  <table className="w-full text-xs text-ink-muted border-t border-line-subtle pt-2">
                    <tbody>
                      <tr>
                        <td className="text-left py-0.5">日割り予算</td>
                        <td className="text-right py-0.5">{formatYen(dailyAllowance)}</td>
                      </tr>
                      {carryOver ? (
                        <>
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
                        <tr>
                          <td className="text-left py-0.5">本日の出費</td>
                          <td className="text-right py-0.5">− {formatYen(todayExpense)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  {(() => {
                    const remaining = daysInMonth - dayOfMonth
                    const count = Math.min(remaining, 5)
                    if (count === 0) return null
                    return (
                      <div className="text-xs text-ink-muted bg-surface-subtle rounded-lg px-3 py-2 space-y-1">
                        {Array.from({ length: count }, (_, i) => {
                          const n = i + 1
                          const future = carryOver
                            ? Math.round(dailyAllowance * (dayOfMonth + n) - monthToDateExpense)
                            : Math.round(dailyAllowance)
                          return (
                            <div key={n} className="flex justify-between">
                              <span>{n}日後</span>
                              <span className="flex items-center gap-1">
                                <span
                                  className={future >= 0 ? 'text-income-600' : 'text-danger-500'}
                                >
                                  {formatYen(future)}
                                </span>
                                <span className="text-[10px] text-income-600">
                                  (+{formatYen(Math.round(dailyAllowance))})
                                </span>
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
      </div>

      {upcomingEvents.length > 0 && (
        <div className="bg-surface rounded-2xl p-6 shadow-sm space-y-3">
          <div className="text-sm font-semibold text-ink-muted">今後の予定出費</div>
          <ul className="divide-y divide-line-subtle">
            {upcomingEvents.map((event) => (
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
                  <span className="font-semibold text-ink">{formatYen(event.planned_expense)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
