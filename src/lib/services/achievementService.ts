import { supabase } from '../supabase'

export type AchievementData = {
  fixedCount: number
  unsubCount: number
  txDates: string[]
  shoppingAllCount: number
  shoppingBoughtCount: number
  shoppingPlanCount: number
}

export const achievementService = {
  fetchData: async (userId: string): Promise<AchievementData> => {
    const [fixedRes, unsubRes, txRes, shoppingAllRes, shoppingBoughtRes, shoppingPlanRes] =
      await Promise.all([
        supabase.from('fixed_expenses').select('id', { count: 'exact' }).eq('user_id', userId),
        supabase
          .from('fixed_expenses')
          .select('id', { count: 'exact' })
          .eq('user_id', userId)
          .in('status', ['unsubscribed', 'cancelled']),
        supabase.from('transactions').select('date').eq('user_id', userId).eq('type', 'expense'),
        supabase.from('shopping_items').select('id', { count: 'exact' }).eq('user_id', userId),
        supabase
          .from('shopping_items')
          .select('id', { count: 'exact' })
          .eq('user_id', userId)
          .eq('status', 'bought'),
        supabase
          .from('shopping_items')
          .select('id', { count: 'exact' })
          .eq('user_id', userId)
          .eq('status', 'bought')
          .gt('budget_amount', 0),
      ])

    return {
      fixedCount: fixedRes.count ?? 0,
      unsubCount: unsubRes.count ?? 0,
      txDates: (txRes.data ?? []).map((r) => r.date),
      shoppingAllCount: shoppingAllRes.count ?? 0,
      shoppingBoughtCount: shoppingBoughtRes.count ?? 0,
      shoppingPlanCount: shoppingPlanRes.count ?? 0,
    }
  },
}
