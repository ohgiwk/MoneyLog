import { supabase } from '../supabase'
import type { Transaction } from '../database.types'
import { periodKey, periodRange } from '../../utils'

type TransactionInsert = Omit<Transaction, 'id' | 'created_at'>

const TABLE = 'transactions'

export const transactionService = {
  fetchByMonth: async (userId: string, month: string, startDay = 1): Promise<Transaction[]> => {
    const { from, to } = periodRange(month, startDay)
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: false })
    if (error) throw new Error(error.message)
    return data ?? []
  },

  fetchByDateRange: async (userId: string, from: string, to: string): Promise<Transaction[]> => {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: false })
    if (error) throw new Error(error.message)
    return data ?? []
  },

  insert: async (data: TransactionInsert): Promise<void> => {
    const { error } = await supabase.from(TABLE).insert(data)
    if (error) throw new Error(error.message)
  },

  update: async (id: string, data: Partial<TransactionInsert>): Promise<void> => {
    const { error } = await supabase.from(TABLE).update(data).eq('id', id)
    if (error) throw new Error(error.message)
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from(TABLE).delete().eq('id', id)
    if (error) throw new Error(error.message)
  },

  fetchByYear: async (userId: string, year: string): Promise<Transaction[]> => {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .gte('date', `${year}-01-01`)
      .lte('date', `${year}-12-31`)
      .order('date', { ascending: false })
    if (error) throw new Error(error.message)
    return data ?? []
  },

  fetchAvailableMonths: async (userId: string, startDay = 1): Promise<string[]> => {
    const { data, error } = await supabase.from(TABLE).select('date').eq('user_id', userId)
    if (error) throw new Error(error.message)
    const months = new Set((data ?? []).map((t: { date: string }) => periodKey(t.date, startDay)))
    return [...months].sort().reverse() as string[]
  },

  fetchRecent: async (userId: string, limit = 5): Promise<Transaction[]> => {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw new Error(error.message)
    return data ?? []
  },
}
