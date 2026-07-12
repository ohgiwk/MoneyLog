import { supabase } from '../supabase'
import { cachedFetch, cacheSet } from '../cache'

const TABLE = 'budgets'

export interface BudgetSettings {
  fixed: number
  consumable: number
  oneTimeByCategory: Record<string, number>
}

const empty = (): BudgetSettings => ({ fixed: 0, consumable: 0, oneTimeByCategory: {} })

export const budgetService = {
  fetchByMonth: async (userId: string, month: string): Promise<BudgetSettings> => {
    return cachedFetch(`${TABLE}:${userId}:${month}`, async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', userId)
        .eq('month', month)
        .maybeSingle()
      if (error) throw new Error(error.message)
      if (!data) return empty()
      return {
        fixed: data.fixed,
        consumable: data.consumable,
        oneTimeByCategory: (data.one_time_by_category as Record<string, number>) ?? {},
      }
    })
  },

  save: async (userId: string, month: string, budget: BudgetSettings): Promise<void> => {
    const { error } = await supabase.from('budgets').upsert({
      user_id: userId,
      month,
      fixed: budget.fixed,
      consumable: budget.consumable,
      one_time_by_category: budget.oneTimeByCategory,
    })
    if (error) throw new Error(error.message)
    cacheSet(`${TABLE}:${userId}:${month}`, budget)
  },
}

export function oneTimeBudgetTotal(budget: BudgetSettings): number {
  return Object.values(budget.oneTimeByCategory).reduce((s, v) => s + v, 0)
}
