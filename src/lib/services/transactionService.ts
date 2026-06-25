import { supabase } from '../supabase'
import type { Transaction } from '../database.types'

type TransactionInsert = Omit<Transaction, 'id' | 'created_at'>

export const transactionService = {
  fetchByMonth: async (userId: string, month: string): Promise<Transaction[]> => {
    const from = `${month}-01`
    const to = `${month}-31`
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: false })
    return data ?? []
  },

  insert: async (data: TransactionInsert): Promise<void> => {
    await supabase.from('transactions').insert(data)
  },

  delete: async (id: string): Promise<void> => {
    await supabase.from('transactions').delete().eq('id', id)
  },
}
