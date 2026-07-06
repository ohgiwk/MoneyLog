import { supabase } from '../supabase'
import type { Database } from '../database.types'
import { cachedFetch, cacheInvalidateTable } from '../cache'

type WishlistItem = Database['public']['Tables']['wishlist_items']['Row']
type WishlistInsert = Database['public']['Tables']['wishlist_items']['Insert']

export type { WishlistItem }

const TABLE = 'wishlist_items'

export const wishlistService = {
  fetchByUser: async (userId: string): Promise<WishlistItem[]> => {
    return cachedFetch(`${TABLE}:${userId}`, async () => {
      const { data, error } = await supabase
        .from('wishlist_items')
        .select('*')
        .eq('user_id', userId)
        .order('priority', { ascending: true })
      if (error) throw new Error(error.message)
      return data ?? []
    })
  },

  insert: async (item: WishlistInsert): Promise<WishlistItem> => {
    const { data, error } = await supabase
      .from('wishlist_items')
      .insert(item)
      .select()
      .single()
    if (error) throw new Error(error.message)
    cacheInvalidateTable(TABLE)
    return data
  },

  update: async (id: string, item: Partial<WishlistInsert>): Promise<void> => {
    const { error } = await supabase.from('wishlist_items').update(item).eq('id', id)
    if (error) throw new Error(error.message)
    cacheInvalidateTable(TABLE)
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('wishlist_items').delete().eq('id', id)
    if (error) throw new Error(error.message)
    cacheInvalidateTable(TABLE)
  },
}
