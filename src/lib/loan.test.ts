import { describe, expect, it } from 'vitest'
import type { FixedExpense } from './database.types'
import {
  isActiveFixedExpense,
  isLoanFinished,
  loanEndMonth,
  loanInstallments,
  loanProgress,
  toMonthlyAmount,
} from './loan'

function loan(overrides: Partial<FixedExpense> = {}): FixedExpense {
  return {
    id: 'loan-1',
    user_id: 'u',
    name: '自動車ローン',
    category: 'ローン',
    amount: 30000,
    baseline_amount: 30000,
    cycle: 'monthly',
    billing_day: null,
    status: 'active',
    start_date: '2025-01-01',
    notes: null,
    currency: null,
    usd_amount: null,
    loan_start_month: '2025-01',
    loan_end_month: '2025-12',
    created_at: '2025-01-01',
    ...overrides,
  }
}

describe('loanEndMonth / loanInstallments', () => {
  it('開始月と分割回数から終了月を求める（年跨ぎ含む）', () => {
    expect(loanEndMonth('2025-01', 1)).toBe('2025-01')
    expect(loanEndMonth('2025-01', 12)).toBe('2025-12')
    expect(loanEndMonth('2025-11', 36)).toBe('2028-10')
  })

  it('終了月から分割回数を逆算できる', () => {
    expect(loanInstallments('2025-11', '2028-10')).toBe(36)
  })
})

describe('loanProgress', () => {
  const period = { startMonth: '2025-01', endMonth: '2025-12', installments: 12 }

  it('開始前は全回数が残る', () => {
    expect(loanProgress(period, 360000, '2024-12')).toEqual({
      paidCount: 0,
      remainingCount: 12,
      remainingAmount: 360000,
    })
  })

  it('当月分を含めて残り回数・残額（総額 / 分割回数 × 残り回数）を計算する', () => {
    expect(loanProgress(period, 360000, '2025-04')).toEqual({
      paidCount: 3,
      remainingCount: 9,
      remainingAmount: 270000,
    })
    expect(loanProgress(period, 360000, '2025-12').remainingAmount).toBe(30000)
  })

  it('終了月を過ぎると残額0', () => {
    expect(loanProgress(period, 360000, '2026-01').remainingAmount).toBe(0)
  })
})

describe('isLoanFinished / isActiveFixedExpense', () => {
  it('終了月までは契約中として合計に含める', () => {
    expect(isLoanFinished(loan(), '2025-12')).toBe(false)
    expect(isActiveFixedExpense(loan(), '2025-12')).toBe(true)
  })

  it('終了月を過ぎたら完済として合計から除外する', () => {
    expect(isLoanFinished(loan(), '2026-01')).toBe(true)
    expect(isActiveFixedExpense(loan(), '2026-01')).toBe(false)
  })

  it('期間未設定のローンやローン以外は終了扱いにしない', () => {
    expect(isLoanFinished(loan({ loan_start_month: null, loan_end_month: null }), '2030-01')).toBe(
      false
    )
    expect(isLoanFinished(loan({ category: 'サブスク' }), '2030-01')).toBe(false)
  })
})

describe('toMonthlyAmount', () => {
  it('ローンは総額を分割回数で割って月額換算する', () => {
    expect(toMonthlyAmount(loan({ amount: 360000 }), 360000)).toBe(30000)
  })

  it('期間未設定のローンやその他はサイクルで換算する', () => {
    const noPeriod = loan({ loan_start_month: null, loan_end_month: null })
    expect(toMonthlyAmount(noPeriod, 30000)).toBe(30000)
    expect(toMonthlyAmount(loan({ category: 'サブスク', cycle: 'yearly' }), 12000)).toBe(1000)
  })
})
