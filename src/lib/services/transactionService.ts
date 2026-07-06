import { supabase } from '../supabase'
import type { Transaction } from '../database.types'
import { cachedFetch, cacheInvalidateTable } from '../cache'

type TransactionInsert = Omit<Transaction, 'id' | 'created_at'>

const TABLE = 'transactions'

export const transactionService = {
  fetchByMonth: async (userId: string, month: string): Promise<Transaction[]> => {
    return cachedFetch(`${TABLE}:${userId}:${month}`, async () => {
      const [year, monthNum] = month.split('-').map(Number)
      const lastDay = new Date(year, monthNum, 0).getDate()
      const from = `${month}-01`
      const to = `${month}-${String(lastDay).padStart(2, '0')}`
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .gte('date', from)
        .lte('date', to)
        .order('date', { ascending: false })
      if (error) throw new Error(error.message)
      return data ?? []
    })
  },

  insert: async (data: TransactionInsert): Promise<void> => {
    const { error } = await supabase.from('transactions').insert(data)
    if (error) throw new Error(error.message)
    cacheInvalidateTable(TABLE)
  },

  update: async (id: string, data: Partial<TransactionInsert>): Promise<void> => {
    const { error } = await supabase.from('transactions').update(data).eq('id', id)
    if (error) throw new Error(error.message)
    cacheInvalidateTable(TABLE)
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) throw new Error(error.message)
    cacheInvalidateTable(TABLE)
  },

  fetchAvailableMonths: async (userId: string): Promise<string[]> => {
    return cachedFetch(`${TABLE}:months:${userId}`, async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('date')
        .eq('user_id', userId)
      if (error) throw new Error(error.message)
      const months = new Set((data ?? []).map((t: { date: string }) => t.date.slice(0, 7)))
      return [...months].sort().reverse() as string[]
    })
  },

  fetchRecent: async (userId: string, limit = 5): Promise<Transaction[]> => {
    return cachedFetch(`${TABLE}:recent:${userId}:${limit}`, async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw new Error(error.message)
      return data ?? []
    })
  },
}
