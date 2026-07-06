import { supabase } from '../supabase'
import type { FixedExpense } from '../database.types'
import { cachedFetch, cacheInvalidateTable } from '../cache'

type FixedExpenseInsert = Omit<FixedExpense, 'id' | 'created_at'>
type FixedExpenseUpdate = Partial<FixedExpenseInsert>

const TABLE = 'fixed_expenses'

export const fixedExpenseService = {
  fetchByUser: async (userId: string): Promise<FixedExpense[]> => {
    return cachedFetch(`${TABLE}:${userId}`, async () => {
      const { data, error } = await supabase
        .from('fixed_expenses')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
      if (error) throw new Error(error.message)
      return data ?? []
    })
  },

  insert: async (data: FixedExpenseInsert): Promise<FixedExpense | null> => {
    const { data: row, error } = await supabase
      .from('fixed_expenses')
      .insert(data)
      .select()
      .single()
    if (error) throw new Error(error.message)
    cacheInvalidateTable(TABLE)
    return row ?? null
  },

  insertMany: async (data: FixedExpenseInsert[]): Promise<void> => {
    if (data.length === 0) return
    const { error } = await supabase.from('fixed_expenses').insert(data)
    if (error) throw new Error(error.message)
    cacheInvalidateTable(TABLE)
  },

  update: async (id: string, data: FixedExpenseUpdate): Promise<void> => {
    const { error } = await supabase.from('fixed_expenses').update(data).eq('id', id)
    if (error) throw new Error(error.message)
    cacheInvalidateTable(TABLE)
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('fixed_expenses').delete().eq('id', id)
    if (error) throw new Error(error.message)
    cacheInvalidateTable(TABLE)
  },

  fetchByUserWithIds: async (userId: string, ids: string[]): Promise<FixedExpense[]> => {
    return cachedFetch(`${TABLE}:withIds:${userId}:${ids.slice().sort().join(',')}`, async () => {
      const { data, error } = await supabase
        .from('fixed_expenses')
        .select('*')
        .eq('user_id', userId)
        .in('id', ids)
      if (error) throw new Error(error.message)
      return data ?? []
    })
  },
}
