import { supabase } from '../supabase'
import type { Database, ShiftType, Workplace } from '../database.types'
import { DEFAULT_SHIFT_TYPES, type ShiftTypeDraft } from '../workShift'

type WorkplaceInsert = Database['public']['Tables']['workplaces']['Insert']
type ShiftTypeUpdate = Database['public']['Tables']['shift_types']['Update']

export interface WorkplaceData {
  workplaces: Workplace[]
  shiftTypes: ShiftType[]
}

async function fetchAll(userId: string): Promise<WorkplaceData> {
  const [wRes, tRes] = await Promise.all([
    supabase.from('workplaces').select('*').eq('user_id', userId),
    supabase
      .from('shift_types')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
  ])
  if (wRes.error) throw new Error(wRes.error.message)
  if (tRes.error) throw new Error(tRes.error.message)
  return { workplaces: wRes.data ?? [], shiftTypes: tRes.data ?? [] }
}

async function insertShiftTypes(
  userId: string,
  workplaceId: string,
  drafts: ShiftTypeDraft[]
): Promise<ShiftType[]> {
  if (drafts.length === 0) return []
  const { data, error } = await supabase
    .from('shift_types')
    .insert(
      drafts.map((d, i) => ({
        user_id: userId,
        workplace_id: workplaceId,
        name: d.name,
        kind: d.kind,
        time_ranges: d.time_ranges,
        color: d.color,
        sort_order: i,
        archived: false,
      }))
    )
    .select('*')
  if (error) throw new Error(error.message)
  return data ?? []
}

// 初回利用時に既定の勤務先・区分を作成する
async function seedDefaults(userId: string): Promise<void> {
  const { data: workplace, error } = await supabase
    .from('workplaces')
    .insert({ user_id: userId, name: '勤務先', start_date: null })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  await insertShiftTypes(userId, workplace.id, DEFAULT_SHIFT_TYPES)
}

// StrictMode 等で同時に呼ばれても既定データを二重作成しない
const seeding = new Map<string, Promise<void>>()

export const workplaceService = {
  // 勤務先と区分を取得する。未作成なら既定データを作ってから返す
  fetchOrSeed: async (userId: string): Promise<WorkplaceData> => {
    const data = await fetchAll(userId)
    if (data.workplaces.length > 0) return data
    let p = seeding.get(userId)
    if (!p) {
      p = seedDefaults(userId).finally(() => seeding.delete(userId))
      seeding.set(userId, p)
    }
    await p
    return fetchAll(userId)
  },

  // 勤務先を追加する。copyFrom を指定するとその勤務先の区分（削除済みを除く）を複製する
  insertWorkplace: async (
    data: WorkplaceInsert,
    copyFrom: ShiftType[] = []
  ): Promise<Workplace> => {
    const { data: workplace, error } = await supabase
      .from('workplaces')
      .insert(data)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    await insertShiftTypes(data.user_id, workplace.id, copyFrom)
    return workplace
  },

  updateWorkplace: async (id: string, data: Partial<WorkplaceInsert>): Promise<void> => {
    const { error } = await supabase.from('workplaces').update(data).eq('id', id)
    if (error) throw new Error(error.message)
  },

  deleteWorkplace: async (id: string): Promise<void> => {
    const { error } = await supabase.from('workplaces').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },

  insertShiftType: async (
    userId: string,
    workplaceId: string,
    draft: ShiftTypeDraft,
    sortOrder: number
  ): Promise<void> => {
    const { error } = await supabase.from('shift_types').insert({
      user_id: userId,
      workplace_id: workplaceId,
      ...draft,
      sort_order: sortOrder,
      archived: false,
    })
    if (error) throw new Error(error.message)
  },

  updateShiftType: async (id: string, data: ShiftTypeUpdate): Promise<void> => {
    const { error } = await supabase.from('shift_types').update(data).eq('id', id)
    if (error) throw new Error(error.message)
  },

  // 過去の記録から参照され続けるよう、削除は非表示（archived）にする
  archiveShiftType: async (id: string): Promise<void> => {
    const { error } = await supabase.from('shift_types').update({ archived: true }).eq('id', id)
    if (error) throw new Error(error.message)
  },
}
