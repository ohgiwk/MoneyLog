import { supabase } from '../supabase'
import type { FixedExpense } from '../database.types'

type FixedExpenseInsert = Omit<FixedExpense, 'id' | 'created_at'>
type FixedExpenseUpdate = Partial<FixedExpenseInsert>

export const fixedExpenseService = {
  fetchByUser: async (userId: string): Promise<FixedExpense[]> => {
    const { data, error } = await supabase
      .from('fixed_expenses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    if (error) throw new Error(error.message)
    return data ?? []
  },

  insert: async (data: FixedExpenseInsert): Promise<void> => {
    const { error } = await supabase.from('fixed_expenses').insert(data)
    if (error) throw new Error(error.message)
  },

  insertMany: async (data: FixedExpenseInsert[]): Promise<void> => {
    if (data.length === 0) return
    const { error } = await supabase.from('fixed_expenses').insert(data)
    if (error) throw new Error(error.message)
  },

  update: async (id: string, data: FixedExpenseUpdate): Promise<void> => {
    const { error } = await supabase.from('fixed_expenses').update(data).eq('id', id)
    if (error) throw new Error(error.message)
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('fixed_expenses').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },

  fetchByUserWithIds: async (userId: string, ids: string[]): Promise<FixedExpense[]> => {
    const { data, error } = await supabase
      .from('fixed_expenses')
      .select('*')
      .eq('user_id', userId)
      .in('id', ids)
    if (error) throw new Error(error.message)
    return data ?? []
  },
}
