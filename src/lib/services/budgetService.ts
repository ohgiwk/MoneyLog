import { supabase } from '../supabase'

const TABLE = 'budgets'

export interface BudgetSettings {
  income: number
  fixed: number
  consumable: number
  savings: number
  oneTimeByCategory: Record<string, number>
}

const empty = (): BudgetSettings => ({ income: 0, fixed: 0, consumable: 0, savings: 0, oneTimeByCategory: {} })

export const budgetService = {
  fetchByMonth: async (userId: string, month: string): Promise<BudgetSettings> => {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .eq('month', month)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) return empty()
    return {
      income: data.income ?? 0,
      fixed: data.fixed,
      consumable: data.consumable,
      savings: data.savings ?? 0,
      oneTimeByCategory: (data.one_time_by_category as Record<string, number>) ?? {},
    }
  },

  save: async (userId: string, month: string, budget: BudgetSettings): Promise<void> => {
    const { error } = await supabase.from(TABLE).upsert({
      user_id: userId,
      month,
      income: budget.income,
      fixed: budget.fixed,
      consumable: budget.consumable,
      savings: budget.savings,
      one_time_by_category: budget.oneTimeByCategory,
    })
    if (error) throw new Error(error.message)
  },
}

export function oneTimeBudgetTotal(budget: BudgetSettings): number {
  return Object.values(budget.oneTimeByCategory).reduce((s, v) => s + v, 0)
}
