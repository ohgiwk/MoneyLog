import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useCumulativeSavings } from './useCumulativeSavings'

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

import { supabase } from '../lib/supabase'

type FromReturn = ReturnType<typeof supabase.from>

// select().eq().(lte|lt|なし) の呼び出しを受け、指定したデータで解決するチェーン
function chain(data: unknown[]) {
  const result = Promise.resolve({ data, error: null })
  const c = {
    select: vi.fn(() => c),
    eq: vi.fn(() => Object.assign(result, c)),
    lte: vi.fn(() => result),
    lt: vi.fn(() => result),
  }
  return c
}

let tables: Record<string, ReturnType<typeof chain>>

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  // 前月が 30 日までの月（9月）になる日付
  vi.setSystemTime(new Date('2026-10-14T12:00:00'))
  tables = {
    budgets: chain([{ month: '2026-09', savings: 0, income: 300000 }]),
    transactions: chain([
      { date: '2026-09-30', amount: 5000, type: 'expense', expense_kind: 'one_time' },
      { date: '2026-09-10', amount: 3000, type: 'expense', expense_kind: 'one_time' },
      { date: '2026-09-15', amount: 100000, type: 'income', expense_kind: null },
    ]),
    fixed_expenses: chain([
      {
        id: 'f1',
        category: '住居費',
        amount: 80000,
        cycle: 'monthly',
        status: 'active',
        loan_start_month: null,
        loan_end_month: null,
      },
    ]),
    // 記録がない月は現在の設定の合計で計算する
    fixed_expense_monthly_records: chain([]),
  }
  vi.mocked(supabase.from).mockImplementation(
    (table: string) => tables[table] as unknown as FromReturn
  )
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useCumulativeSavings', () => {
  it('取引は当月 1 日より前で絞り込み、存在しない日付（9月31日など）を使わない', async () => {
    const { result } = renderHook(() => useCumulativeSavings('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(tables.transactions.lt).toHaveBeenCalledWith('date', '2026-10-01')
    expect(tables.transactions.lte).not.toHaveBeenCalled()
    expect(tables.budgets.lte).toHaveBeenCalledWith('month', '2026-09')
  })

  it('月別内訳に、その月の出費の合計が反映される', async () => {
    const { result } = renderHook(() => useCumulativeSavings('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.monthlyBreakdown).toEqual([
      {
        month: '2026-09',
        budgetIncome: 300000,
        fixedExpenses: 80000,
        oneTimeExpenses: 8000,
        total: 300000 - 80000 - 8000,
      },
    ])
    expect(result.current.total).toBe(212000)
  })

  it('固定費の記録がある月はその月の合計を、ない月は現在の設定の合計を使う', async () => {
    tables.budgets = chain([
      { month: '2026-08', savings: 0, income: 300000 },
      { month: '2026-09', savings: 0, income: 300000 },
    ])
    tables.transactions = chain([])
    tables.fixed_expense_monthly_records = chain([
      { month: '2026-09', monthly_amount: 50000 },
      { month: '2026-09', monthly_amount: 3000 },
    ])

    const { result } = renderHook(() => useCumulativeSavings('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(tables.fixed_expense_monthly_records.lt).toHaveBeenCalledWith('month', '2026-10')
    const fixed = Object.fromEntries(
      result.current.monthlyBreakdown.map((e) => [e.month, e.fixedExpenses])
    )
    expect(fixed).toEqual({ '2026-09': 53000, '2026-08': 80000 })
    expect(result.current.total).toBe(300000 - 53000 + (300000 - 80000))
  })

  it('記録がない月は、年払いを更新月にだけ年額で含める', async () => {
    tables.budgets = chain([
      { month: '2026-08', savings: 0, income: 300000 },
      { month: '2026-09', savings: 0, income: 300000 },
    ])
    tables.transactions = chain([])
    tables.fixed_expenses = chain([
      {
        id: 'y1',
        name: '保険',
        category: '保険',
        amount: 24000,
        cycle: 'yearly',
        status: 'active',
        renewal_month: 8,
        loan_start_month: null,
        loan_end_month: null,
      },
    ])

    const { result } = renderHook(() => useCumulativeSavings('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    const fixed = Object.fromEntries(
      result.current.monthlyBreakdown.map((e) => [e.month, e.fixedExpenses])
    )
    expect(fixed).toEqual({ '2026-09': 0, '2026-08': 24000 })
  })
})
