import { describe, it, expect, vi, beforeEach } from 'vitest'
import { transactionService } from './transactionService'

vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

import { supabase } from '../supabase'

function mockChain(resolvedData: unknown) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: resolvedData, error: null }),
    insert: vi.fn().mockResolvedValue({ error: null }),
    delete: vi.fn().mockReturnThis(),
  }
  // delete().eq() で resolve するため eq を上書き
  chain.delete = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('transactionService.fetchByMonth', () => {
  it('userId と month に対応するトランザクションを返す', async () => {
    const mockData = [{ id: '1', user_id: 'u1', date: '2024-03-10', amount: 1000, type: 'expense' }]
    const chain = mockChain(mockData)
    vi.mocked(supabase.from).mockReturnValue(chain as unknown as ReturnType<typeof supabase.from>)

    const result = await transactionService.fetchByMonth('u1', '2024-03')

    expect(supabase.from).toHaveBeenCalledWith('transactions')
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'u1')
    expect(chain.gte).toHaveBeenCalledWith('date', '2024-03-01')
    expect(chain.lte).toHaveBeenCalledWith('date', '2024-03-31')
    expect(result).toEqual(mockData)
  })

  it('データが null のとき空配列を返す', async () => {
    const chain = mockChain(null)
    vi.mocked(supabase.from).mockReturnValue(chain as unknown as ReturnType<typeof supabase.from>)

    const result = await transactionService.fetchByMonth('u1', '2024-03')
    expect(result).toEqual([])
  })
})

describe('transactionService.insert', () => {
  it('transactions テーブルに insert を呼ぶ', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(supabase.from).mockReturnValue({
      insert: insertMock,
    } as unknown as ReturnType<typeof supabase.from>)

    const data = {
      user_id: 'u1',
      type: 'expense' as const,
      expense_kind: 'routine' as const,
      date: '2024-03-10',
      category: '食費',
      amount: 500,
      memo: null,
      store_type: null,
      meal_type: null,
      payment_type: null,
      payment_method: null,
      recurring_rule_id: null,
    }
    await transactionService.insert(data)

    expect(supabase.from).toHaveBeenCalledWith('transactions')
    expect(insertMock).toHaveBeenCalledWith(data)
  })
})

describe('transactionService.delete', () => {
  it('指定した id のレコードを削除する', async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null })
    const deleteMock = vi.fn().mockReturnValue({ eq: eqMock })
    vi.mocked(supabase.from).mockReturnValue({
      delete: deleteMock,
    } as unknown as ReturnType<typeof supabase.from>)

    await transactionService.delete('tx-123')

    expect(supabase.from).toHaveBeenCalledWith('transactions')
    expect(deleteMock).toHaveBeenCalled()
    expect(eqMock).toHaveBeenCalledWith('id', 'tx-123')
  })
})

describe('transactionService.fetchByDateRange', () => {
  it('from〜to の日付範囲でトランザクションを取得する', async () => {
    const mockData = [{ id: '1', date: '2026-07-10', amount: 1000 }]
    const chain = mockChain(mockData)
    vi.mocked(supabase.from).mockReturnValue(chain as unknown as ReturnType<typeof supabase.from>)

    const result = await transactionService.fetchByDateRange('u1', '2026-07-01', '2026-07-31')

    expect(chain.gte).toHaveBeenCalledWith('date', '2026-07-01')
    expect(chain.lte).toHaveBeenCalledWith('date', '2026-07-31')
    expect(result).toEqual(mockData)
  })

  it('データが null のとき空配列を返す', async () => {
    const chain = mockChain(null)
    vi.mocked(supabase.from).mockReturnValue(chain as unknown as ReturnType<typeof supabase.from>)

    const result = await transactionService.fetchByDateRange('u1', '2026-07-01', '2026-07-31')
    expect(result).toEqual([])
  })
})

describe('transactionService.update', () => {
  it('指定した id のレコードを update する', async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null })
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
    vi.mocked(supabase.from).mockReturnValue({
      update: updateMock,
    } as unknown as ReturnType<typeof supabase.from>)

    await transactionService.update('tx-1', { amount: 2000 })

    expect(supabase.from).toHaveBeenCalledWith('transactions')
    expect(updateMock).toHaveBeenCalledWith({ amount: 2000 })
    expect(eqMock).toHaveBeenCalledWith('id', 'tx-1')
  })
})

describe('transactionService.fetchByYear', () => {
  it('指定した年の全トランザクションを取得する', async () => {
    const mockData = [{ id: '1', date: '2026-05-10', amount: 1000 }]
    const chain = mockChain(mockData)
    vi.mocked(supabase.from).mockReturnValue(chain as unknown as ReturnType<typeof supabase.from>)

    const result = await transactionService.fetchByYear('u1', '2026')

    expect(chain.gte).toHaveBeenCalledWith('date', '2026-01-01')
    expect(chain.lte).toHaveBeenCalledWith('date', '2026-12-31')
    expect(result).toEqual(mockData)
  })

  it('データが null のとき空配列を返す', async () => {
    const chain = mockChain(null)
    vi.mocked(supabase.from).mockReturnValue(chain as unknown as ReturnType<typeof supabase.from>)

    const result = await transactionService.fetchByYear('u1', '2026')
    expect(result).toEqual([])
  })
})

describe('transactionService.fetchAvailableMonths', () => {
  it('取引日から集計月の重複除去・降順一覧を返す', async () => {
    const mockDates = [{ date: '2026-03-15' }, { date: '2026-07-20' }, { date: '2026-07-05' }]
    const eqMock = vi.fn().mockResolvedValue({ data: mockDates, error: null })
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock,
    } as unknown as ReturnType<typeof supabase.from>)

    const result = await transactionService.fetchAvailableMonths('u1')

    expect(selectMock).toHaveBeenCalledWith('date')
    // 7月が2件あっても重複除去され、降順で返る
    expect(result).toEqual(['2026-07', '2026-03'])
  })

  it('データが null のとき空配列を返す', async () => {
    const eqMock = vi.fn().mockResolvedValue({ data: null, error: null })
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock,
    } as unknown as ReturnType<typeof supabase.from>)

    const result = await transactionService.fetchAvailableMonths('u1')
    expect(result).toEqual([])
  })
})

describe('transactionService.fetchRecent', () => {
  it('最新 N 件のトランザクションを取得する', async () => {
    const mockData = [{ id: '1', date: '2026-07-10', amount: 500 }]
    const limitMock = vi.fn().mockResolvedValue({ data: mockData, error: null })
    const order2Mock = vi.fn().mockReturnValue({ limit: limitMock })
    const order1Mock = vi.fn().mockReturnValue({ order: order2Mock })
    const eqMock = vi.fn().mockReturnValue({ order: order1Mock })
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock,
    } as unknown as ReturnType<typeof supabase.from>)

    const result = await transactionService.fetchRecent('u1', 3)

    expect(limitMock).toHaveBeenCalledWith(3)
    expect(result).toEqual(mockData)
  })
})
