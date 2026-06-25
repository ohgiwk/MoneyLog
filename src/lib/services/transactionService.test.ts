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
    vi.mocked(supabase.from).mockReturnValue(chain as ReturnType<typeof supabase.from>)

    const result = await transactionService.fetchByMonth('u1', '2024-03')

    expect(supabase.from).toHaveBeenCalledWith('transactions')
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'u1')
    expect(chain.gte).toHaveBeenCalledWith('date', '2024-03-01')
    expect(chain.lte).toHaveBeenCalledWith('date', '2024-03-31')
    expect(result).toEqual(mockData)
  })

  it('データが null のとき空配列を返す', async () => {
    const chain = mockChain(null)
    vi.mocked(supabase.from).mockReturnValue(chain as ReturnType<typeof supabase.from>)

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
