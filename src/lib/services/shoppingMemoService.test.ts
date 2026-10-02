import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shoppingMemoService } from './shoppingMemoService'

vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

import { supabase } from '../supabase'

function mockUpdateChain(error: { message: string } | null = null) {
  const chain = {
    update: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({ error }),
  }
  vi.mocked(supabase.from).mockReturnValue(chain as unknown as ReturnType<typeof supabase.from>)
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('shoppingMemoService.deleteItems', () => {
  it('指定した id のアイテムを bought に更新する', async () => {
    const chain = mockUpdateChain()

    await shoppingMemoService.deleteItems(['a', 'b'])

    expect(supabase.from).toHaveBeenCalledWith('shopping_items')
    expect(chain.update).toHaveBeenCalledWith({ status: 'bought' })
    expect(chain.in).toHaveBeenCalledWith('id', ['a', 'b'])
  })

  it('id が空のときは DB を呼ばない', async () => {
    await shoppingMemoService.deleteItems([])

    expect(supabase.from).not.toHaveBeenCalled()
  })
})

describe('shoppingMemoService.restoreItems', () => {
  it('指定した id のアイテムを pending に戻す', async () => {
    const chain = mockUpdateChain()

    await shoppingMemoService.restoreItems(['a', 'b'])

    expect(supabase.from).toHaveBeenCalledWith('shopping_items')
    expect(chain.update).toHaveBeenCalledWith({ status: 'pending' })
    expect(chain.in).toHaveBeenCalledWith('id', ['a', 'b'])
  })

  it('id が空のときは DB を呼ばない', async () => {
    await shoppingMemoService.restoreItems([])

    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('DB がエラーを返したら例外を投げる', async () => {
    mockUpdateChain({ message: 'boom' })

    await expect(shoppingMemoService.restoreItems(['a'])).rejects.toThrow('boom')
  })
})
