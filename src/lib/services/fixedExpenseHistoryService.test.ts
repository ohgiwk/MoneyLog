import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fixedExpenseHistoryService } from './fixedExpenseHistoryService'

vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

import { supabase } from '../supabase'

type FromReturn = ReturnType<typeof supabase.from>

beforeEach(() => {
  vi.clearAllMocks()
})

const row = {
  user_id: 'u1',
  month: '2026-10',
  fixed_expense_id: 'fe-1',
  name: '家賃',
  category: '住居費',
  monthly_amount: 80000,
}

describe('fixedExpenseHistoryService.fetchByUser', () => {
  it('ユーザーの記録を新しい月から順に返す', async () => {
    const mockData = [{ id: 'r1', ...row }]
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    }
    vi.mocked(supabase.from).mockReturnValue(chain as unknown as FromReturn)

    const result = await fixedExpenseHistoryService.fetchByUser('u1')

    expect(supabase.from).toHaveBeenCalledWith('fixed_expense_monthly_records')
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'u1')
    expect(chain.order).toHaveBeenCalledWith('month', { ascending: false })
    expect(result).toEqual(mockData)
  })

  it('データが null のとき空配列を返す', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    vi.mocked(supabase.from).mockReturnValue(chain as unknown as FromReturn)
    expect(await fixedExpenseHistoryService.fetchByUser('u1')).toEqual([])
  })

  it('エラー時は例外を投げる', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: 'fail' } }),
    }
    vi.mocked(supabase.from).mockReturnValue(chain as unknown as FromReturn)
    await expect(fixedExpenseHistoryService.fetchByUser('u1')).rejects.toThrow('fail')
  })
})

describe('fixedExpenseHistoryService.fetchByMonth', () => {
  it('ユーザーと月で絞り込む', async () => {
    const eq = vi
      .fn()
      .mockReturnValueOnce({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) })
    const chain = { select: vi.fn().mockReturnValue({ eq }) }
    vi.mocked(supabase.from).mockReturnValue(chain as unknown as FromReturn)

    const result = await fixedExpenseHistoryService.fetchByMonth('u1', '2026-10')

    expect(eq).toHaveBeenCalledWith('user_id', 'u1')
    expect(eq.mock.results[0].value.eq).toHaveBeenCalledWith('month', '2026-10')
    expect(result).toEqual([])
  })
})

describe('fixedExpenseHistoryService.upsertMany', () => {
  it('ユーザー・月・固定費の組み合わせで upsert する', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(supabase.from).mockReturnValue({ upsert } as unknown as FromReturn)

    await fixedExpenseHistoryService.upsertMany([row])

    expect(upsert).toHaveBeenCalledWith([row], { onConflict: 'user_id,month,fixed_expense_id' })
  })

  it('空配列のときは DB を呼ばない', async () => {
    await fixedExpenseHistoryService.upsertMany([])
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('エラー時は例外を投げる', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: { message: 'conflict' } })
    vi.mocked(supabase.from).mockReturnValue({ upsert } as unknown as FromReturn)
    await expect(fixedExpenseHistoryService.upsertMany([row])).rejects.toThrow('conflict')
  })
})

describe('fixedExpenseHistoryService.deleteByIds', () => {
  it('指定した id の行を削除する', async () => {
    const inMock = vi.fn().mockResolvedValue({ error: null })
    const del = vi.fn().mockReturnValue({ in: inMock })
    vi.mocked(supabase.from).mockReturnValue({ delete: del } as unknown as FromReturn)

    await fixedExpenseHistoryService.deleteByIds(['r1', 'r2'])

    expect(inMock).toHaveBeenCalledWith('id', ['r1', 'r2'])
  })

  it('空配列のときは DB を呼ばない', async () => {
    await fixedExpenseHistoryService.deleteByIds([])
    expect(supabase.from).not.toHaveBeenCalled()
  })
})
