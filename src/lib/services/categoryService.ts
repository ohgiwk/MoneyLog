import { supabase } from '../supabase'
import type { CategoryInfo } from '../../constants'

type CategoryType = 'expense' | 'income' | 'fixed'

export const categoryService = {
  fetchAll: async (userId: string): Promise<Partial<Record<CategoryType, CategoryInfo[]>>> => {
    const { data, error } = await supabase
      .from('user_categories')
      .select('type, categories')
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
    const result: Partial<Record<CategoryType, CategoryInfo[]>> = {}
    for (const row of data ?? []) {
      result[row.type as CategoryType] = row.categories as CategoryInfo[]
    }
    return result
  },

  save: async (userId: string, type: CategoryType, categories: CategoryInfo[]): Promise<void> => {
    const { error } = await supabase.from('user_categories').upsert({
      user_id: userId,
      type,
      categories: categories as unknown as Record<string, unknown>[],
      updated_at: new Date().toISOString(),
    })
    if (error) throw new Error(error.message)
  },
}
