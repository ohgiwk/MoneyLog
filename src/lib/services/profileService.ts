import { supabase } from '../supabase'
import type { Profile } from '../database.types'

export const profileService = {
  fetchById: async (userId: string): Promise<Profile | null> => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    return data ?? null
  },

  update: async (userId: string, data: Partial<Profile>): Promise<void> => {
    await supabase.from('profiles').update(data).eq('id', userId)
  },
}
