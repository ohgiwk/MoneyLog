import { useEffect, useMemo, useState } from 'react'
import { transactionService } from '../lib/services/transactionService'
import { fixedExpenseService } from '../lib/services/fixedExpenseService'
import { profileService } from '../lib/services/profileService'
import type { FixedExpense, Transaction } from '../lib/database.types'
import { formatYen, periodDayCount, periodDayIndex, periodKey, todayStr } from '../utils'
import { budgetService, oneTimeBudgetTotal, type BudgetSettings } from '../lib/services/budgetService'

interface Props {
  userId: string
}

const carryOverKey = (userId: string) => `pocketMoneyCarryOver_${userId}`

export default function HomeTab({ userId }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([])
  const [budget, setBudget] = useState<BudgetSettings>({ fixed: 0, consumable: 0, oneTimeByCategory: {} })
  const [monthStartDay, setMonthStartDay] = useState(1)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [carryOver, setCarryOver] = useState(() => {
    return localStorage.getItem(carryOverKey(userId)) === 'true'
  })

  const today = todayStr()
  const period = periodKey(today, monthStartDay)

  useEffect(() => {
    const load = async () => {
      setFetchError(null)
      try {
        const profile = await profileService.fetchById(userId)
        const startDay = profile?.month_start_day ?? 1
        setMonthStartDay(startDay)
        const currentPeriod = periodKey(today, startDay)

        const [txs, fixed, budgetSettings] = await Promise.all([
          transactionService.fetchByMonth(userId, currentPeriod, startDay),
          fixedExpenseService.fetchByUser(userId),
          budgetService.fetchByUser(userId),
        ])
        setTransactions(txs)
        setFixedExpenses(fixed)
        setBudget(budgetSettings)
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : 'データの読み込みに失敗しました')
      }
    }
    void load()
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleCarryOverChange(next: boolean) {
    setCarryOver(next)
    localStorage.setItem(carryOverKey(userId), String(next))
  }

  const totalFixed = useMemo(() => {
    const activeFixed = fixedExpenses.filter((f) => f.status === 'active' || f.status === 'reviewing')
    return activeFixed.reduce((s, f) => s + (f.amount ?? 0) / (f.cycle === 'yearly' ? 12 : 1), 0)
  }, [fixedExpenses])

  const monthlyBudgetTotal = budget.fixed + budget.consumable + oneTimeBudgetTotal(budget)

  const daysInMonth = useMemo(
    () => periodDayCount(period, monthStartDay),
    [period, monthStartDay]
  )

  const dailyAllowance = (monthlyBudgetTotal - totalFixed) / daysInMonth

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

  return (
    <div className="p-4 space-y-4">
      {fetchError && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-600">
          {fetchError}
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 shadow-sm text-center space-y-4">
        <div className="text-sm font-semibold text-slate-500">本日のお小遣い</div>
        <div className={`text-4xl font-bold ${todayAllowance >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
          {formatYen(todayAllowance)}
        </div>

        <table className="w-full text-xs text-slate-500">
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

        <div className="flex items-center justify-center gap-3 pt-2">
          <span className="text-sm text-slate-600">お小遣い繰り越し</span>
          <button
            role="switch"
            aria-checked={carryOver}
            onClick={() => handleCarryOverChange(!carryOver)}
            className={`w-11 h-6 rounded-full transition-colors relative ${
              carryOver ? 'bg-emerald-500' : 'bg-slate-200'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                carryOver ? 'translate-x-5' : ''
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  )
}
