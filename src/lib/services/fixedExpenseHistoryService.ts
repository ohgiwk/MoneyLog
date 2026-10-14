import { supabase } from '../supabase'
import type { FixedExpenseMonthlyRecord, FixedExpenseMonthlyRecordInsert } from '../database.types'

const TABLE = 'fixed_expense_monthly_records'

export const fixedExpenseHistoryService = {
  fetchByUser: async (userId: string): Promise<FixedExpenseMonthlyRecord[]> => {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('month', { ascending: false })
    if (error) throw new Error(error.message)
    return data ?? []
  },

  fetchByMonth: async (userId: string, month: string): Promise<FixedExpenseMonthlyRecord[]> => {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .eq('month', month)
    if (error) throw new Error(error.message)
    return data ?? []
  },

  // 複数端末で同時に起動しても同じ月・同じ固定費の行が重複しないよう、一意制約で upsert する
  upsertMany: async (rows: FixedExpenseMonthlyRecordInsert[]): Promise<void> => {
    if (rows.length === 0) return
    const { error } = await supabase
      .from(TABLE)
      .upsert(rows, { onConflict: 'user_id,month,fixed_expense_id' })
    if (error) throw new Error(error.message)
  },

  deleteByIds: async (ids: string[]): Promise<void> => {
    if (ids.length === 0) return
    const { error } = await supabase.from(TABLE).delete().in('id', ids)
    if (error) throw new Error(error.message)
  },
}
