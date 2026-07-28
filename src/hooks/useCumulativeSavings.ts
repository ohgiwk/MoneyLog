import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useCumulativeSavings(userId: string) {
  const [total, setTotal] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    let cancelled = false

    async function calculate() {
      const [budgetsRes, txRes] = await Promise.all([
        supabase
          .from('budgets')
          .select('month, savings, one_time_by_category')
          .eq('user_id', userId),
        supabase
          .from('transactions')
          .select('date, amount, expense_kind')
          .eq('user_id', userId)
          .eq('type', 'expense')
          .eq('expense_kind', 'one_time'),
      ])

      if (cancelled) return

      const budgets = budgetsRes.data ?? []
      const transactions = txRes.data ?? []

      // 月別の臨時費実績を集計
      const actualByMonth = new Map<string, number>()
      for (const tx of transactions) {
        const month = tx.date.slice(0, 7)
        actualByMonth.set(month, (actualByMonth.get(month) ?? 0) + tx.amount)
      }

      let cumulative = 0
      for (const b of budgets) {
        const savings = b.savings ?? 0
        const oneTimeBudget = Object.values(
          (b.one_time_by_category as Record<string, number>) ?? {}
        ).reduce((s, v) => s + v, 0)
        const actualOneTime = actualByMonth.get(b.month) ?? 0
        cumulative += savings + (oneTimeBudget - actualOneTime)
      }

      setTotal(cumulative)
      setLoading(false)
    }

    calculate()
    return () => { cancelled = true }
  }, [userId])

  return { total, loading }
}
