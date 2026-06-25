import { supabase } from '../supabase'
import type { FixedExpense } from '../database.types'

type FixedExpenseInsert = Omit<FixedExpense, 'id' | 'created_at'>
type FixedExpenseUpdate = Partial<FixedExpenseInsert>

export const fixedExpenseService = {
  fetchByUser: async (userId: string): Promise<FixedExpense[]> => {
    const { data } = await supabase
      .from('fixed_expenses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    return data ?? []
  },

  insert: async (data: FixedExpenseInsert): Promise<void> => {
    await supabase.from('fixed_expenses').insert(data)
  },

  insertMany: async (data: FixedExpenseInsert[]): Promise<void> => {
    if (data.length === 0) return
    await supabase.from('fixed_expenses').insert(data)
  },

  update: async (id: string, data: FixedExpenseUpdate): Promise<void> => {
    await supabase.from('fixed_expenses').update(data).eq('id', id)
  },

  delete: async (id: string): Promise<void> => {
    await supabase.from('fixed_expenses').delete().eq('id', id)
  },

  fetchByUserWithIds: async (userId: string, ids: string[]): Promise<FixedExpense[]> => {
    const { data } = await supabase
      .from('fixed_expenses')
      .select('*')
      .eq('user_id', userId)
      .in('id', ids)
    return data ?? []
  },
}
