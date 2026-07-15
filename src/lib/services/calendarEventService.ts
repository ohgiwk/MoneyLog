import { supabase } from '../supabase'
import type { CalendarEvent } from '../database.types'

type CalendarEventInsert = Omit<CalendarEvent, 'id' | 'created_at'>

const TABLE = 'calendar_events'

export const calendarEventService = {
  fetchByMonth: async (userId: string, month: string): Promise<CalendarEvent[]> => {
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
      .order('date', { ascending: true })
      .order('start_time', { ascending: true, nullsFirst: true })
    if (error) throw new Error(error.message)
    return data ?? []
  },

  fetchUpcomingExpenses: async (userId: string, fromDate: string): Promise<CalendarEvent[]> => {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .gte('date', fromDate)
      .gt('planned_expense', 0)
      .order('date', { ascending: true })
    if (error) throw new Error(error.message)
    return data ?? []
  },

  insert: async (data: CalendarEventInsert): Promise<void> => {
    const { error } = await supabase.from(TABLE).insert(data)
    if (error) throw new Error(error.message)
  },

  update: async (id: string, data: Partial<CalendarEventInsert>): Promise<void> => {
    const { error } = await supabase.from(TABLE).update(data).eq('id', id)
    if (error) throw new Error(error.message)
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from(TABLE).delete().eq('id', id)
    if (error) throw new Error(error.message)
  },
}
