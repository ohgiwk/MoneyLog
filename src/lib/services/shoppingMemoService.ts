import { supabase } from '../supabase'
import type { ShoppingItem } from '../database.types'

async function ensureOpenList(userId: string): Promise<string> {
  const { data: lists, error: listError } = await supabase
    .from('shopping_lists')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'open')
    .limit(1)
  if (listError) throw new Error(listError.message)

  if (lists && lists.length > 0) return lists[0].id as string

  const { data: newList, error: createError } = await supabase
    .from('shopping_lists')
    .insert({
      user_id: userId,
      name: '買い物メモ',
      planned_date: new Date().toISOString().slice(0, 10),
      status: 'open',
      total_budget: 0,
    })
    .select('id')
    .single()
  if (createError) throw new Error(createError.message)
  return newList.id as string
}

export const shoppingMemoService = {
  fetchItems: async (userId: string): Promise<ShoppingItem[]> => {
    const listId = await ensureOpenList(userId)
    const { data, error } = await supabase
      .from('shopping_items')
      .select('*')
      .eq('list_id', listId)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) throw new Error(error.message)
    return data ?? []
  },

  addItem: async (userId: string, name: string): Promise<ShoppingItem> => {
    const listId = await ensureOpenList(userId)
    const { data, error } = await supabase
      .from('shopping_items')
      .insert({
        list_id: listId,
        user_id: userId,
        name,
        category: '',
        budget_amount: 0,
        status: 'pending',
        is_template: false,
        sort_order: Math.floor(Date.now() / 1000),
      })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data
  },

  updateItem: async (id: string, name: string): Promise<void> => {
    const { error } = await supabase
      .from('shopping_items')
      .update({ name })
      .eq('id', id)
    if (error) throw new Error(error.message)
  },

  deleteItem: async (id: string): Promise<void> => {
    const { error } = await supabase.from('shopping_items').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },

  deleteItems: async (ids: string[]): Promise<void> => {
    if (ids.length === 0) return
    const { error } = await supabase.from('shopping_items').delete().in('id', ids)
    if (error) throw new Error(error.message)
  },
}
