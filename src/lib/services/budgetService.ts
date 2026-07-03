import { supabase } from '../supabase'

export interface BudgetSettings {
  fixed: number
  consumable: number
  oneTimeByCategory: Record<string, number>
}

const empty = (): BudgetSettings => ({ fixed: 0, consumable: 0, oneTimeByCategory: {} })

export const budgetService = {
  fetchByUser: async (userId: string): Promise<BudgetSettings> => {
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) return empty()
    return {
      fixed: data.fixed,
      consumable: data.consumable,
      oneTimeByCategory: (data.one_time_by_category as Record<string, number>) ?? {},
    }
  },

  save: async (userId: string, budget: BudgetSettings): Promise<void> => {
    const { error } = await supabase.from('budgets').upsert({
      user_id: userId,
      fixed: budget.fixed,
      consumable: budget.consumable,
      one_time_by_category: budget.oneTimeByCategory,
    })
    if (error) throw new Error(error.message)
  },
}

export function oneTimeBudgetTotal(budget: BudgetSettings): number {
  return Object.values(budget.oneTimeByCategory).reduce((s, v) => s + v, 0)
}
