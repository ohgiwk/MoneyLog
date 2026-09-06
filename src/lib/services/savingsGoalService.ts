import { supabase } from '../supabase'
import type { Database } from '../database.types'

type SavingsGoal = Database['public']['Tables']['savings_goals']['Row']
export type { SavingsGoal }

const TABLE = 'savings_goals'

export const savingsGoalService = {
  fetchByUser: async (userId: string): Promise<SavingsGoal[]> => {
    const { data, error } = await supabase.from(TABLE).select('*').eq('user_id', userId)
    if (error) throw new Error(error.message)
    return data ?? []
  },

  saveAllocations: async (
    userId: string,
    allocations: { wishlistItemId: string; amount: number; monthlyTarget?: number }[]
  ): Promise<void> => {
    const { error: delError } = await supabase.from(TABLE).delete().eq('user_id', userId)
    if (delError) throw new Error(delError.message)

    if (allocations.length === 0) return

    const rows = allocations.map((a) => ({
      user_id: userId,
      wishlist_item_id: a.wishlistItemId,
      target_amount: a.amount,
      monthly_target: a.monthlyTarget ?? 0,
    }))
    const { error: insError } = await supabase.from(TABLE).insert(rows)
    if (insError) throw new Error(insError.message)
  },
}
