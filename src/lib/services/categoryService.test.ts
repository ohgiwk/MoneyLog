import { describe, it, expect, vi, beforeEach } from 'vitest'
import { categoryService } from './categoryService'

vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

import { supabase } from '../supabase'

type Call = { table: string; op: string; payload?: unknown; filters: [string, unknown][] }

// テーブルごとの操作とフィルタを記録するモック。select の結果は selectData で返す
function mockSupabase(selectData: Record<string, unknown[]> = {}) {
  const calls: Call[] = []
  vi.mocked(supabase.from).mockImplementation(((table: string) => {
    const call: Call = { table, op: '', filters: [] }
    const chain = {
      update: (payload: unknown) => {
        call.op = 'update'
        call.payload = payload
        calls.push(call)
        return chain
      },
      select: () => {
        call.op = 'select'
        calls.push(call)
        return chain
      },
      eq: (col: string, val: unknown) => {
        call.filters.push([col, val])
        return chain
      },
      then: (resolve: (v: unknown) => void) =>
        resolve({ data: call.op === 'select' ? (selectData[table] ?? []) : null, error: null }),
    }
    return chain
  }) as unknown as typeof supabase.from)
  return calls
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('categoryService.rename', () => {
  it('支出カテゴリは取引・消耗品・予算のカテゴリ名を書き換える', async () => {
    const calls = mockSupabase({
      budgets: [
        { month: '2026-08', one_time_by_category: { 食費: 30000 } },
        { month: '2026-09', one_time_by_category: { 日用品: 5000 } },
      ],
    })

    await categoryService.rename('u1', 'expense', '食費', '食料品')

    const updates = calls.filter((c) => c.op === 'update')
    expect(updates).toEqual([
      {
        table: 'transactions',
        op: 'update',
        payload: { category: '食料品' },
        filters: [
          ['user_id', 'u1'],
          ['category', '食費'],
          ['type', 'expense'],
        ],
      },
      {
        table: 'consumables',
        op: 'update',
        payload: { category: '食料品' },
        filters: [
          ['user_id', 'u1'],
          ['category', '食費'],
        ],
      },
      // 旧カテゴリ名を含む月だけを更新する
      {
        table: 'budgets',
        op: 'update',
        payload: { one_time_by_category: { 食料品: 30000 } },
        filters: [
          ['user_id', 'u1'],
          ['month', '2026-08'],
        ],
      },
    ])
  })

  it('収入カテゴリは収入の取引だけを書き換える', async () => {
    const calls = mockSupabase()
    await categoryService.rename('u1', 'income', '給与', '給料')
    expect(calls.map((c) => [c.table, c.op])).toEqual([['transactions', 'update']])
    expect(calls[0].filters).toContainEqual(['type', 'income'])
  })

  it('固定費カテゴリは固定費だけを書き換える', async () => {
    const calls = mockSupabase()
    await categoryService.rename('u1', 'fixed', '通信費', '通信')
    expect(calls.map((c) => [c.table, c.op])).toEqual([['fixed_expenses', 'update']])
  })

  it('名前が変わっていなければ何もしない', async () => {
    const calls = mockSupabase()
    await categoryService.rename('u1', 'expense', '食費', '食費')
    expect(calls).toEqual([])
  })

  it('更新に失敗したらエラーを投げる', async () => {
    vi.mocked(supabase.from).mockImplementation((() => {
      const chain = {
        update: () => chain,
        eq: () => chain,
        then: (resolve: (v: unknown) => void) =>
          resolve({ data: null, error: { message: 'permission denied' } }),
      }
      return chain
    }) as unknown as typeof supabase.from)
    await expect(categoryService.rename('u1', 'fixed', '通信費', '通信')).rejects.toThrow(
      'permission denied'
    )
  })
})
