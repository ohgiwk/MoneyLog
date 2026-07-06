import { supabase } from '../supabase'
import type { CalendarEvent } from '../database.types'
import { cachedFetch, cacheInvalidateTable } from '../cache'

type CalendarEventInsert = Omit<CalendarEvent, 'id' | 'created_at'>

const TABLE = 'calendar_events'

export const calendarEventService = {
  fetchByMonth: async (userId: string, month: string): Promise<CalendarEvent[]> => {
    return cachedFetch(`${TABLE}:${userId}:${month}`, async () => {
      const [year, monthNum] = month.split('-').map(Number)
      const lastDay = new Date(year, monthNum, 0).getDate()
      const from = `${month}-01`
      const to = `${month}-${String(lastDay).padStart(2, '0')}`
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', userId)
        .gte('date', from)
        .lte('date', to)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true, nullsFirst: true })
      if (error) throw new Error(error.message)
      return data ?? []
    })
  },

  insert: async (data: CalendarEventInsert): Promise<void> => {
    const { error } = await supabase.from('calendar_events').insert(data)
    if (error) throw new Error(error.message)
    cacheInvalidateTable(TABLE)
  },

  update: async (id: string, data: Partial<CalendarEventInsert>): Promise<void> => {
    const { error } = await supabase.from('calendar_events').update(data).eq('id', id)
    if (error) throw new Error(error.message)
    cacheInvalidateTable(TABLE)
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('calendar_events').delete().eq('id', id)
    if (error) throw new Error(error.message)
    cacheInvalidateTable(TABLE)
  },
}
