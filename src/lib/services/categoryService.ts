import { supabase } from '../supabase'
import type { CategoryInfo } from '../../constants'
import { renameCategoryKey } from '../../utils'

type CategoryType = 'expense' | 'income' | 'fixed'

async function renameColumn(
  table: 'transactions' | 'consumables' | 'fixed_expenses',
  userId: string,
  oldName: string,
  newName: string,
  type?: 'expense' | 'income'
): Promise<void> {
  let query = supabase
    .from(table)
    .update({ category: newName })
    .eq('user_id', userId)
    .eq('category', oldName)
  if (type) query = query.eq('type', type)
  const { error } = await query
  if (error) throw new Error(error.message)
}

// 月ごとの予算に保存されたカテゴリ別予算のキーを付け替える
async function renameBudgetKeys(userId: string, oldName: string, newName: string): Promise<void> {
  const { data, error } = await supabase
    .from('budgets')
    .select('month, one_time_by_category')
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
  for (const row of data ?? []) {
    const map = (row.one_time_by_category ?? {}) as Record<string, number>
    if (!(oldName in map)) continue
    const { error: updError } = await supabase
      .from('budgets')
      .update({ one_time_by_category: renameCategoryKey(map, oldName, newName) })
      .eq('user_id', userId)
      .eq('month', row.month)
    if (updError) throw new Error(updError.message)
  }
}

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

  // カテゴリ名の変更を、その名前で保存されている過去の記録にも反映する。
  // 何度実行しても同じ結果になるため、途中で失敗しても再実行すればよい
  rename: async (
    userId: string,
    type: CategoryType,
    oldName: string,
    newName: string
  ): Promise<void> => {
    if (oldName === newName) return
    if (type === 'fixed') {
      await renameColumn('fixed_expenses', userId, oldName, newName)
      return
    }
    await renameColumn('transactions', userId, oldName, newName, type)
    if (type === 'expense') {
      await renameColumn('consumables', userId, oldName, newName)
      await renameBudgetKeys(userId, oldName, newName)
    }
  },
}
