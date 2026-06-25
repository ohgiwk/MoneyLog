import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fixedExpenseService } from './fixedExpenseService'

vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

import { supabase } from '../supabase'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('fixedExpenseService.fetchByUser', () => {
  it('userId に対応する固定費一覧を返す', async () => {
    const mockData = [{ id: '1', user_id: 'u1', name: '家賃', category: '住居費', amount: 80000 }]
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    }
    vi.mocked(supabase.from).mockReturnValue(chain as ReturnType<typeof supabase.from>)

    const result = await fixedExpenseService.fetchByUser('u1')

    expect(supabase.from).toHaveBeenCalledWith('fixed_expenses')
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'u1')
    expect(result).toEqual(mockData)
  })

  it('データが null のとき空配列を返す', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    vi.mocked(supabase.from).mockReturnValue(chain as ReturnType<typeof supabase.from>)

    const result = await fixedExpenseService.fetchByUser('u1')
    expect(result).toEqual([])
  })
})

describe('fixedExpenseService.insert', () => {
  it('fixed_expenses テーブルに insert を呼ぶ', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(supabase.from).mockReturnValue({
      insert: insertMock,
    } as unknown as ReturnType<typeof supabase.from>)

    const data = {
      user_id: 'u1',
      name: '家賃',
      category: '住居費',
      amount: 80000,
      baseline_amount: 80000,
      cycle: 'monthly' as const,
      status: 'active' as const,
      start_date: '2024-01-01',
      billing_day: null,
      notes: null,
    }
    await fixedExpenseService.insert(data)

    expect(supabase.from).toHaveBeenCalledWith('fixed_expenses')
    expect(insertMock).toHaveBeenCalledWith(data)
  })
})

describe('fixedExpenseService.insertMany', () => {
  it('空配列のとき supabase を呼ばない', async () => {
    await fixedExpenseService.insertMany([])
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('複数件を一括 insert する', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(supabase.from).mockReturnValue({
      insert: insertMock,
    } as unknown as ReturnType<typeof supabase.from>)

    const rows = [
      {
        user_id: 'u1',
        name: '家賃',
        category: '住居費',
        amount: 80000,
        baseline_amount: 80000,
        cycle: 'monthly' as const,
        status: 'active' as const,
        start_date: '2024-01-01',
        billing_day: null,
        notes: null,
      },
      {
        user_id: 'u1',
        name: '電気代',
        category: '光熱費',
        amount: 5000,
        baseline_amount: 5000,
        cycle: 'monthly' as const,
        status: 'active' as const,
        start_date: '2024-01-01',
        billing_day: null,
        notes: null,
      },
    ]
    await fixedExpenseService.insertMany(rows)

    expect(supabase.from).toHaveBeenCalledWith('fixed_expenses')
    expect(insertMock).toHaveBeenCalledWith(rows)
  })
})

describe('fixedExpenseService.update', () => {
  it('指定した id のレコードを update する', async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null })
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
    vi.mocked(supabase.from).mockReturnValue({
      update: updateMock,
    } as unknown as ReturnType<typeof supabase.from>)

    await fixedExpenseService.update('fe-1', { amount: 75000, status: 'reviewing' })

    expect(supabase.from).toHaveBeenCalledWith('fixed_expenses')
    expect(updateMock).toHaveBeenCalledWith({ amount: 75000, status: 'reviewing' })
    expect(eqMock).toHaveBeenCalledWith('id', 'fe-1')
  })
})

describe('fixedExpenseService.delete', () => {
  it('指定した id のレコードを削除する', async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null })
    const deleteMock = vi.fn().mockReturnValue({ eq: eqMock })
    vi.mocked(supabase.from).mockReturnValue({
      delete: deleteMock,
    } as unknown as ReturnType<typeof supabase.from>)

    await fixedExpenseService.delete('fe-1')

    expect(supabase.from).toHaveBeenCalledWith('fixed_expenses')
    expect(deleteMock).toHaveBeenCalled()
    expect(eqMock).toHaveBeenCalledWith('id', 'fe-1')
  })
})
