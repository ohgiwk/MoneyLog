import { supabase } from '../supabase'
import type { Profile } from '../database.types'
import { cachedFetch, cacheRemove } from '../cache'

const TABLE = 'profiles'

export const profileService = {
  fetchById: async (userId: string): Promise<Profile | null> => {
    return cachedFetch(`${TABLE}:${userId}`, async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
      if (error && error.code !== 'PGRST116') throw new Error(error.message)
      return data ?? null
    })
  },

  update: async (userId: string, data: Partial<Profile>): Promise<void> => {
    const { error } = await supabase.from('profiles').update(data).eq('id', userId)
    if (error) throw new Error(error.message)
    cacheRemove(`${TABLE}:${userId}`)
  },
}
