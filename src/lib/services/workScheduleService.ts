import { supabase } from '../supabase'
import type { WorkSchedule } from '../database.types'

const TABLE = 'work_schedule'

export const workScheduleService = {
  fetchByMonth: async (userId: string, month: string): Promise<WorkSchedule[]> => {
    const [year, monthNum] = month.split('-').map(Number)
    const lastDay = new Date(year, monthNum, 0).getDate()
    const from = `${month}-01`
    const to = `${month}-${String(lastDay).padStart(2, '0')}`
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .gte('date', from)
      .lte('date', to)
    if (error) throw new Error(error.message)
    return data ?? []
  },

  setDayType: async (userId: string, date: string, dayType: WorkSchedule['day_type']): Promise<void> => {
    const { error } = await supabase
      .from(TABLE)
      .upsert({ user_id: userId, date, day_type: dayType }, { onConflict: 'user_id,date' })
    if (error) throw new Error(error.message)
  },

  clearDayType: async (userId: string, date: string): Promise<void> => {
    const { error } = await supabase.from(TABLE).delete().eq('user_id', userId).eq('date', date)
    if (error) throw new Error(error.message)
  },
}
