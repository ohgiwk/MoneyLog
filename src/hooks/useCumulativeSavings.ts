import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { isActiveFixedExpense, toMonthlyAmount } from '../lib/loan'
import { fixedTotalsByMonth } from '../lib/fixedExpenseHistory'
import { shiftMonth, todayStr } from '../utils'

export interface MonthlySavingEntry {
  month: string
  budgetIncome: number
  fixedExpenses: number
  oneTimeExpenses: number
  total: number
}

export function useCumulativeSavings(userId: string) {
  const [total, setTotal] = useState<number | null>(null)
  const [monthlyAverage, setMonthlyAverage] = useState<number | null>(null)
  const [monthlyBreakdown, setMonthlyBreakdown] = useState<MonthlySavingEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    let cancelled = false

    async function calculate() {
      const currentMonth = todayStr().slice(0, 7)
      const lastMonth = shiftMonth(currentMonth, -1)

      const [budgetsRes, txRes, fixedRes, recordsRes] = await Promise.all([
        supabase
          .from('budgets')
          .select('month, savings, income')
          .eq('user_id', userId)
          .lte('month', lastMonth),
        supabase
          .from('transactions')
          .select('date, amount, type, expense_kind')
          .eq('user_id', userId)
          // 末日を `${lastMonth}-31` とすると 30 日までの月で存在しない日付になり、クエリが失敗するため
          // 当月 1 日より前で絞り込む
          .lt('date', `${currentMonth}-01`),
        supabase
          .from('fixed_expenses')
          .select('id, category, amount, cycle, status, loan_start_month, loan_end_month')
          .eq('user_id', userId),
        supabase
          .from('fixed_expense_monthly_records')
          .select('month, monthly_amount')
          .eq('user_id', userId)
          .lt('month', currentMonth),
      ])

      if (cancelled) return

      const budgets = budgetsRes.data ?? []
      const transactions = txRes.data ?? []
      const fixedExpenses = fixedRes.data ?? []
      const fixedByMonth = fixedTotalsByMonth(recordsRes.data ?? [])

      const oneTimeByMonth = new Map<string, number>()

      for (const tx of transactions) {
        const month = tx.date.slice(0, 7)
        if (tx.type === 'expense' && tx.expense_kind === 'one_time') {
          oneTimeByMonth.set(month, (oneTimeByMonth.get(month) ?? 0) + tx.amount)
        }
      }

      // 固定費の記録がない月（記録を始める前の月など）は、現在の設定の合計で計算する
      const currentFixedTotal = fixedExpenses
        .filter((f) => isActiveFixedExpense(f))
        .reduce((s, f) => s + toMonthlyAmount(f, f.amount), 0)

      let cumulative = 0
      const breakdown: MonthlySavingEntry[] = []
      for (const b of budgets) {
        const budgetIncome = b.income ?? 0
        const actualOneTime = oneTimeByMonth.get(b.month) ?? 0
        const monthFixed = fixedByMonth.get(b.month) ?? currentFixedTotal
        const monthTotal = budgetIncome - monthFixed - actualOneTime
        cumulative += monthTotal
        breakdown.push({
          month: b.month,
          budgetIncome,
          fixedExpenses: monthFixed,
          oneTimeExpenses: actualOneTime,
          total: monthTotal,
        })
      }
      breakdown.sort((a, b) => b.month.localeCompare(a.month))

      setTotal(cumulative)
      setMonthlyAverage(budgets.length > 0 ? Math.round(cumulative / budgets.length) : 0)
      setMonthlyBreakdown(breakdown)
      setLoading(false)
    }

    calculate()
    return () => {
      cancelled = true
    }
  }, [userId])

  return { total, monthlyAverage, monthlyBreakdown, loading }
}
