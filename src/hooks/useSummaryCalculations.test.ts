import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useSummaryCalculations } from './useSummaryCalculations'
import type { Consumable, FixedExpense, Transaction } from '../lib/database.types'
import type { BudgetSettings } from '../lib/services/budgetService'

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    user_id: 'u1',
    type: 'expense',
    expense_kind: 'one_time',
    date: '2026-07-10',
    category: '食費',
    amount: 1000,
    memo: null,
    store_type: null,
    meal_type: null,
    payment_type: null,
    payment_method: null,
    recurring_rule_id: null,
    created_at: '2026-07-10T00:00:00Z',
    ...overrides,
  }
}

function makeFixed(overrides: Partial<FixedExpense> = {}): FixedExpense {
  return {
    id: 'fx-1',
    user_id: 'u1',
    name: '家賃',
    category: '住居費',
    amount: 50000,
    baseline_amount: 50000,
    cycle: 'monthly',
    billing_day: null,
    status: 'active',
    start_date: '2026-01-01',
    notes: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeConsumable(overrides: Partial<Consumable> = {}): Consumable {
  return {
    id: 'cs-1',
    user_id: 'u1',
    name: 'トイレットペーパー',
    category: '日用品',
    amount: 300,
    quantity: 1,
    cycle_days: 30,
    members_scale: false,
    last_purchased: '2026-07-01',
    notes: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function emptyBudget(overrides: Partial<BudgetSettings> = {}): BudgetSettings {
  return { income: 0, fixed: 0, consumable: 0, oneTimeByCategory: {}, ...overrides }
}

function setup(options: Partial<Parameters<typeof useSummaryCalculations>[0]> = {}) {
  return renderHook(() =>
    useSummaryCalculations({
      transactions: [],
      fixedExpenses: [],
      consumables: [],
      householdMembers: 1,
      budget: emptyBudget(),
      month: '2026-07',
      ...options,
    })
  )
}

afterEach(() => {
  vi.useRealTimers()
})

describe('useSummaryCalculations — 月次集計', () => {
  it('指定月の収入・臨時出費を月内の取引だけから合計する', () => {
    const transactions = [
      makeTx({ id: 't1', type: 'income', amount: 3000, date: '2026-07-05', category: '給与' }),
      makeTx({ id: 't2', type: 'expense', amount: 1000, date: '2026-07-10' }),
      makeTx({ id: 't3', type: 'expense', amount: 500, date: '2026-06-30' }), // 前月分は除外
    ]
    const { result } = setup({ transactions })
    expect(result.current.income).toBe(3000)
    expect(result.current.oneTimeExpense).toBe(1000)
  })

  it('routine/consumable 種別の取引は臨時出費の集計から除外する', () => {
    const transactions = [
      makeTx({ id: 't1', amount: 1000, expense_kind: 'one_time' }),
      makeTx({ id: 't2', amount: 2000, expense_kind: 'routine' }),
    ]
    const { result } = setup({ transactions })
    expect(result.current.oneTimeExpense).toBe(1000)
  })

  it('定期購入費を人数按分した月額換算コストで合計する', () => {
    const consumables = [
      makeConsumable({ amount: 300, quantity: 1, cycle_days: 30, members_scale: false }),
      makeConsumable({ id: 'cs-2', amount: 900, quantity: 1, cycle_days: 30, members_scale: true }),
    ]
    const { result } = setup({ consumables, householdMembers: 3 })
    // cs-1: 300*1/(30/30) = 300, cs-2: members_scale で cycle=ceil(30/3)=10 → 900*1/(10/30)=2700
    expect(result.current.consumableExpense).toBe(3000)
  })
})

describe('useSummaryCalculations — 固定費集計', () => {
  it('active/reviewing の固定費のみ月額換算で合計し、cancelled/unsubscribed は除外する', () => {
    const fixedExpenses = [
      makeFixed({ id: 'f1', amount: 50000, status: 'active', cycle: 'monthly' }),
      makeFixed({ id: 'f2', amount: 12000, status: 'reviewing', cycle: 'yearly' }),
      makeFixed({ id: 'f3', amount: 9999, status: 'cancelled' }),
      makeFixed({ id: 'f4', amount: 9999, status: 'unsubscribed' }),
    ]
    const { result } = setup({ fixedExpenses })
    // 50000 + 12000/12(=1000) = 51000
    expect(result.current.totalFixed).toBe(51000)
  })

  it('baseline_amount と現在の amount の差分を見直し削減額として合計する', () => {
    const fixedExpenses = [
      makeFixed({ amount: 4000, baseline_amount: 5000, cycle: 'monthly' }),
    ]
    const { result } = setup({ fixedExpenses })
    expect(result.current.totalSaved).toBe(1000)
  })
})

describe('useSummaryCalculations — 収支', () => {
  it('balance は 収入 - 固定費 - 定期購入 - 臨時出費 で計算する', () => {
    const transactions = [
      makeTx({ id: 't1', type: 'income', amount: 300000, date: '2026-07-01', category: '給与' }),
      makeTx({ id: 't2', type: 'expense', amount: 5000, date: '2026-07-05' }),
    ]
    const fixedExpenses = [makeFixed({ amount: 80000, cycle: 'monthly' })]
    const consumables = [makeConsumable({ amount: 3000, quantity: 1, cycle_days: 30 })]
    const { result } = setup({ transactions, fixedExpenses, consumables })
    expect(result.current.balance).toBe(300000 - 80000 - 3000 - 5000)
  })
})

describe('useSummaryCalculations — 週/日/月別カテゴリ集計', () => {
  it('今週・今日・今月のカテゴリ別出費を正しく分離して集計する', () => {
    // 2026-07-08 は水曜日 → 週範囲は 2026-07-06(月)〜2026-07-12(日)
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-08T09:00:00'))

    const transactions = [
      makeTx({ id: 't-today', date: '2026-07-08', category: '食費', amount: 500 }),
      makeTx({ id: 't-this-week', date: '2026-07-06', category: '食費', amount: 1000 }),
      makeTx({ id: 't-last-week', date: '2026-06-29', category: '食費', amount: 2000 }),
      makeTx({ id: 't-this-month', date: '2026-07-20', category: '食費', amount: 300 }),
    ]
    const { result } = setup({ transactions, budget: emptyBudget({ oneTimeByCategory: { 食費: 3100 } }) })

    const row = result.current.oneTimeCategoryRows.find((r) => r.cat === '食費')
    expect(row).toBeDefined()
    // 週: today(500) + this-week(1000) = 1500（先週分・来月分は含まない）
    expect(row!.spent).toBe(1500)
    // 日: today分のみ
    expect(row!.daySpent).toBe(500)
    // 月: today + this-week + this-month = 500+1000+300 = 1800（先週分の6/29は7月ではないので除外）
    expect(row!.monthSpent).toBe(1800)
  })

  it('budget未設定でも当該週に取引があれば hasBudget が true になる', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-08T09:00:00'))
    const transactions = [makeTx({ date: '2026-07-08', category: '食費', amount: 100 })]
    const { result } = setup({ transactions, budget: emptyBudget() })
    expect(result.current.hasBudget).toBe(true)
  })

  it('取引も予算もなければ hasBudget は false', () => {
    const { result } = setup()
    expect(result.current.hasBudget).toBe(false)
  })
})

describe('useSummaryCalculations — カテゴリ別内訳', () => {
  it('oneTimeByCat は当月の臨時出費をカテゴリ別・降順で返す', () => {
    const transactions = [
      makeTx({ id: 't1', category: '娯楽', amount: 500, date: '2026-07-01' }),
      makeTx({ id: 't2', category: '食費', amount: 3000, date: '2026-07-02' }),
      makeTx({ id: 't3', category: '食費', amount: 1000, date: '2026-07-03' }),
    ]
    const { result } = setup({ transactions })
    expect(result.current.oneTimeByCat).toEqual([
      ['食費', 4000],
      ['娯楽', 500],
    ])
  })

  it('hasBreakdown は固定費/定期購入/臨時出費のいずれかがあれば true', () => {
    const { result: empty } = setup()
    expect(empty.current.hasBreakdown).toBe(false)

    const { result: withFixed } = setup({ fixedExpenses: [makeFixed()] })
    expect(withFixed.current.hasBreakdown).toBe(true)
  })
})
