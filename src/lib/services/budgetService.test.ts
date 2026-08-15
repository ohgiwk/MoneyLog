import { describe, it, expect, vi, beforeEach } from 'vitest'
import { budgetService, oneTimeBudgetTotal } from './budgetService'
import type { BudgetSettings } from './budgetService'

vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

import { supabase } from '../supabase'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('budgetService.fetchByMonth', () => {
  function mockChain(resolvedData: unknown) {
    const maybeSingleMock = vi.fn().mockResolvedValue(resolvedData)
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: maybeSingleMock,
    }
    vi.mocked(supabase.from).mockReturnValue(chain as unknown as ReturnType<typeof supabase.from>)
    return chain
  }

  it('データがある場合 BudgetSettings を返す', async () => {
    const mockRow = {
      income: 300000,
      fixed: 80000,
      consumable: 5000,
      savings: 10000,
      one_time_by_category: { 食費: 20000 },
    }
    mockChain({ data: mockRow, error: null })

    const result = await budgetService.fetchByMonth('u1', '2026-07')

    expect(supabase.from).toHaveBeenCalledWith('budgets')
    expect(result).toEqual({
      income: 300000,
      fixed: 80000,
      consumable: 5000,
      savings: 10000,
      oneTimeByCategory: { 食費: 20000 },
    })
  })

  it('データが null のとき空の BudgetSettings を返す', async () => {
    mockChain({ data: null, error: null })

    const result = await budgetService.fetchByMonth('u1', '2026-07')
    expect(result).toEqual({
      income: 0,
      fixed: 0,
      consumable: 0,
      savings: 0,
      oneTimeByCategory: {},
    })
  })

  it('エラーが発生した場合 Error をスローする', async () => {
    mockChain({ data: null, error: { message: 'fetch failed' } })

    await expect(budgetService.fetchByMonth('u1', '2026-07')).rejects.toThrow('fetch failed')
  })
})

describe('budgetService.save', () => {
  it('budgets テーブルに upsert を呼ぶ', async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(supabase.from).mockReturnValue({
      upsert: upsertMock,
    } as unknown as ReturnType<typeof supabase.from>)

    const budget: BudgetSettings = {
      income: 300000,
      fixed: 80000,
      consumable: 5000,
      savings: 10000,
      oneTimeByCategory: { 食費: 20000 },
    }
    await budgetService.save('u1', '2026-07', budget)

    expect(supabase.from).toHaveBeenCalledWith('budgets')
    expect(upsertMock).toHaveBeenCalledWith({
      user_id: 'u1',
      month: '2026-07',
      income: 300000,
      fixed: 80000,
      consumable: 5000,
      savings: 10000,
      one_time_by_category: { 食費: 20000 },
    })
  })

  it('エラーが発生した場合 Error をスローする', async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: { message: 'save failed' } })
    vi.mocked(supabase.from).mockReturnValue({
      upsert: upsertMock,
    } as unknown as ReturnType<typeof supabase.from>)

    await expect(
      budgetService.save('u1', '2026-07', {
        income: 0,
        fixed: 0,
        consumable: 0,
        savings: 0,
        oneTimeByCategory: {},
      })
    ).rejects.toThrow('save failed')
  })
})

describe('oneTimeBudgetTotal', () => {
  it('oneTimeByCategory の値の合計を返す', () => {
    const budget: BudgetSettings = {
      income: 0,
      fixed: 0,
      consumable: 0,
      savings: 0,
      oneTimeByCategory: { 食費: 20000, 娯楽: 5000 },
    }
    expect(oneTimeBudgetTotal(budget)).toBe(25000)
  })

  it('oneTimeByCategory が空のとき 0 を返す', () => {
    const budget: BudgetSettings = {
      income: 0,
      fixed: 0,
      consumable: 0,
      savings: 0,
      oneTimeByCategory: {},
    }
    expect(oneTimeBudgetTotal(budget)).toBe(0)
  })
})
