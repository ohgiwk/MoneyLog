import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { shiftMonth, todayStr } from '../utils'

export function useCumulativeSavings(userId: string) {
  const [total, setTotal] = useState<number | null>(null)
  const [monthlyAverage, setMonthlyAverage] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    let cancelled = false

    async function calculate() {
      const lastMonth = shiftMonth(todayStr().slice(0, 7), -1)
      const lastMonthEnd = `${lastMonth}-31`

      const [budgetsRes, txRes] = await Promise.all([
        supabase
          .from('budgets')
          .select('month, savings, fixed')
          .eq('user_id', userId)
          .lte('month', lastMonth),
        supabase
          .from('transactions')
          .select('date, amount, type, expense_kind')
          .eq('user_id', userId)
          .lte('date', lastMonthEnd),
      ])

      if (cancelled) return

      const budgets = budgetsRes.data ?? []
      const transactions = txRes.data ?? []

      const incomeByMonth = new Map<string, number>()
      const oneTimeByMonth = new Map<string, number>()

      for (const tx of transactions) {
        const month = tx.date.slice(0, 7)
        if (tx.type === 'income') {
          incomeByMonth.set(month, (incomeByMonth.get(month) ?? 0) + tx.amount)
        } else if (tx.type === 'expense' && tx.expense_kind === 'one_time') {
          oneTimeByMonth.set(month, (oneTimeByMonth.get(month) ?? 0) + tx.amount)
        }
      }

      let cumulative = 0
      for (const b of budgets) {
        const savings = b.savings ?? 0
        const fixedBudget = b.fixed ?? 0
        const actualIncome = incomeByMonth.get(b.month) ?? 0
        const actualOneTime = oneTimeByMonth.get(b.month) ?? 0
        cumulative += savings + (actualIncome - fixedBudget - actualOneTime)
      }

      setTotal(cumulative)
      setMonthlyAverage(budgets.length > 0 ? Math.round(cumulative / budgets.length) : 0)
      setLoading(false)
    }

    calculate()
    return () => { cancelled = true }
  }, [userId])

  return { total, monthlyAverage, loading }
}
