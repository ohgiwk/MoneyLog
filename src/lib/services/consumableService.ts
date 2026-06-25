import { supabase } from '../supabase'
import type { Consumable } from '../database.types'

type ConsumableInsert = Omit<Consumable, 'id' | 'created_at'>
type ConsumableUpdate = Partial<ConsumableInsert>

export const consumableService = {
  fetchByUser: async (userId: string): Promise<Consumable[]> => {
    const { data, error } = await supabase
      .from('consumables')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    if (error) throw new Error(error.message)
    return data ?? []
  },

  insert: async (data: ConsumableInsert): Promise<void> => {
    const { error } = await supabase.from('consumables').insert(data)
    if (error) throw new Error(error.message)
  },

  update: async (id: string, data: ConsumableUpdate): Promise<void> => {
    const { error } = await supabase.from('consumables').update(data).eq('id', id)
    if (error) throw new Error(error.message)
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('consumables').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },
}
