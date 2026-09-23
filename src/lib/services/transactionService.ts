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

  fetchFrequentExpenses: async (
    userId: string,
    limit = 15
  ): Promise<{ count: number; tx: Transaction }[]> => {
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - 90)
    const fromStr = from.toISOString().slice(0, 10)
    const toStr = to.toISOString().slice(0, 10)

    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .gte('date', fromStr)
      .lte('date', toStr)
      .order('date', { ascending: false })
    if (error) throw new Error(error.message)

    const transactions: Transaction[] = data ?? []
    // category + amount + memo のみで重複判定（支払方法・店舗種別の違いは同一出費とみなす）
    const keyMap = new Map<string, { count: number; tx: Transaction }>()
    for (const tx of transactions) {
      const key = `${tx.category}|${tx.amount}|${tx.memo ?? ''}`
      const existing = keyMap.get(key)
      if (existing) {
        existing.count++
      } else {
        keyMap.set(key, { count: 1, tx })
      }
    }

    return [...keyMap.values()]
      .filter((item) => item.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
  },
}
