import { supabase } from '../supabase'
import type { Consumable } from '../database.types'

type ConsumableInsert = Omit<Consumable, 'id' | 'created_at'>
type ConsumableUpdate = Partial<ConsumableInsert>

export const consumableService = {
  fetchByUser: async (userId: string): Promise<Consumable[]> => {
    const { data } = await supabase
      .from('consumables')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    return data ?? []
  },

  insert: async (data: ConsumableInsert): Promise<void> => {
    await supabase.from('consumables').insert(data)
  },

  update: async (id: string, data: ConsumableUpdate): Promise<void> => {
    await supabase.from('consumables').update(data).eq('id', id)
  },

  delete: async (id: string): Promise<void> => {
    await supabase.from('consumables').delete().eq('id', id)
  },
}
