import { useEffect, useState } from 'react'
import { savingsService } from '../lib/services/savingsService'
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
      const lastMonth = shiftMonth(todayStr().slice(0, 7), -1)
      const { budgets, transactions, fixedExpenses } = await savingsService.fetchData(
        userId,
        lastMonth
      )

      if (cancelled) return

      const oneTimeByMonth = new Map<string, number>()

      for (const tx of transactions) {
        const month = tx.date.slice(0, 7)
        if (tx.type === 'expense' && tx.expense_kind === 'one_time') {
          oneTimeByMonth.set(month, (oneTimeByMonth.get(month) ?? 0) + tx.amount)
        }
      }

      const totalFixed = fixedExpenses
        .filter((f) => f.status === 'active' || f.status === 'reviewing')
        .reduce((s, f) => s + (f.amount ?? 0) / (f.cycle === 'yearly' ? 12 : 1), 0)

      let cumulative = 0
      const breakdown: MonthlySavingEntry[] = []
      for (const b of budgets) {
        const budgetIncome = b.income ?? 0
        const actualOneTime = oneTimeByMonth.get(b.month) ?? 0
        const monthTotal = budgetIncome - totalFixed - actualOneTime
        cumulative += monthTotal
        breakdown.push({
          month: b.month,
          budgetIncome,
          fixedExpenses: totalFixed,
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
