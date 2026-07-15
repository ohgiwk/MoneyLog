import { supabase } from '../supabase'
import type { Database } from '../database.types'

type WishlistItem = Database['public']['Tables']['wishlist_items']['Row']
type WishlistInsert = Database['public']['Tables']['wishlist_items']['Insert']

export type { WishlistItem }

const TABLE = 'wishlist_items'

export const wishlistService = {
  fetchByUser: async (userId: string): Promise<WishlistItem[]> => {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('priority', { ascending: true })
    if (error) throw new Error(error.message)
    return data ?? []
  },

  insert: async (item: WishlistInsert): Promise<WishlistItem> => {
    const { data, error } = await supabase.from(TABLE).insert(item).select().single()
    if (error) throw new Error(error.message)
    return data
  },

  update: async (id: string, item: Partial<WishlistInsert>): Promise<void> => {
    const { error } = await supabase.from(TABLE).update(item).eq('id', id)
    if (error) throw new Error(error.message)
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from(TABLE).delete().eq('id', id)
    if (error) throw new Error(error.message)
  },
}
