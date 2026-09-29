import { describe, it, expect, vi, beforeEach } from 'vitest'
import { calendarEventService } from './calendarEventService'

vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

import { supabase } from '../supabase'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('calendarEventService.fetchUpcomingExpenses', () => {
  it('指定日以降の予定のうち、予定出費の明細があるものだけを返す', async () => {
    const withExpense = { id: 'e1', expense_items: [{ label: '', amount: 3000 }] }
    const noExpense = { id: 'e2', expense_items: [] }
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [withExpense, noExpense], error: null }),
    }
    vi.mocked(supabase.from).mockReturnValue(chain as unknown as ReturnType<typeof supabase.from>)

    const result = await calendarEventService.fetchUpcomingExpenses('u1', '2026-09-29')

    expect(chain.eq).toHaveBeenCalledWith('user_id', 'u1')
    expect(chain.gte).toHaveBeenCalledWith('date', '2026-09-29')
    expect(result).toEqual([withExpense])
  })
})
