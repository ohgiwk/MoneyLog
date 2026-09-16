import { supabase } from '../supabase'

export type SavingsRawData = {
  budgets: { month: string; savings: number | null; income: number }[]
  transactions: { date: string; amount: number; type: string; expense_kind: string | null }[]
  fixedExpenses: { amount: number | null; cycle: string; status: string }[]
}

export const savingsService = {
  fetchData: async (userId: string, upToMonth: string): Promise<SavingsRawData> => {
    const upToDate = `${upToMonth}-31`
    const [budgetsRes, txRes, fixedRes] = await Promise.all([
      supabase
        .from('budgets')
        .select('month, savings, income')
        .eq('user_id', userId)
        .lte('month', upToMonth),
      supabase
        .from('transactions')
        .select('date, amount, type, expense_kind')
        .eq('user_id', userId)
        .lte('date', upToDate),
      supabase.from('fixed_expenses').select('amount, cycle, status').eq('user_id', userId),
    ])

    return {
      budgets: budgetsRes.data ?? [],
      transactions: txRes.data ?? [],
      fixedExpenses: fixedRes.data ?? [],
    }
  },
}
