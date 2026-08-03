import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { shiftMonth, todayStr } from '../utils'

export function useCumulativeSavings(userId: string) {
  const [total, setTotal] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    let cancelled = false

    async function calculate() {
      const lastMonth = shiftMonth(todayStr().slice(0, 7), -1)
      // 先月末日（どの月でも28日以前は確実に存在するので31を使って範囲上限とする）
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

      // 月別の収入と臨時費実績を集計
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

      // 累計 = Σ (予算の貯蓄額 + 残余額)
      // 残余額 = 実際の収入 - 固定費予算 - 実際の臨時費
      let cumulative = 0
      for (const b of budgets) {
        const savings = b.savings ?? 0
        const fixedBudget = b.fixed ?? 0
        const actualIncome = incomeByMonth.get(b.month) ?? 0
        const actualOneTime = oneTimeByMonth.get(b.month) ?? 0
        const balance = actualIncome - fixedBudget - actualOneTime
        cumulative += savings + balance
      }

      setTotal(cumulative)
      setLoading(false)
    }

    calculate()
    return () => { cancelled = true }
  }, [userId])

  return { total, loading }
}
