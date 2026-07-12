import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTransactionFilters } from './useTransactionFilters'
import type { Transaction } from '../lib/database.types'

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

describe('useTransactionFilters — 期間フィルタ', () => {
  it('startDay を起点とした期間に含まれる取引のみ対象にする', () => {
    // startDay=25 の '2026-07' 期間は 2026-07-25 〜 2026-08-24
    const transactions = [
      makeTx({ id: 't1', date: '2026-07-24' }), // 前期間（起点日未満）
      makeTx({ id: 't2', date: '2026-08-01' }), // 当該期間
      makeTx({ id: 't3', date: '2026-08-24' }), // 当該期間（末日）
    ]
    const { result } = renderHook(() => useTransactionFilters(transactions, '2026-07', 25))
    const ids = result.current.grouped.flatMap(([, txs]) => txs.map((t) => t.id))
    expect(ids).toEqual(['t3', 't2'])
  })
})

describe('useTransactionFilters — カテゴリ一覧', () => {
  it('当該期間の取引からカテゴリの重複なし・ソート済み一覧を作る', () => {
    const transactions = [
      makeTx({ id: 't1', category: '娯楽', date: '2026-07-01' }),
      makeTx({ id: 't2', category: '食費', date: '2026-07-02' }),
      makeTx({ id: 't3', category: '食費', date: '2026-07-03' }),
    ]
    const { result } = renderHook(() => useTransactionFilters(transactions, '2026-07'))
    expect(result.current.categories).toEqual(['娯楽', '食費'])
  })
})

describe('useTransactionFilters — 絞り込み', () => {
  it('typeFilter / categoryFilter で絞り込める', () => {
    const transactions = [
      makeTx({ id: 't1', type: 'expense', category: '食費', date: '2026-07-01' }),
      makeTx({ id: 't2', type: 'income', category: '給与', date: '2026-07-02' }),
      makeTx({ id: 't3', type: 'expense', category: '娯楽', date: '2026-07-03' }),
    ]
    const { result } = renderHook(() => useTransactionFilters(transactions, '2026-07'))

    act(() => result.current.setTypeFilter('income'))
    expect(result.current.grouped.flatMap(([, txs]) => txs.map((t) => t.id))).toEqual(['t2'])

    act(() => {
      result.current.setTypeFilter('all')
      result.current.setCategoryFilter('娯楽')
    })
    expect(result.current.grouped.flatMap(([, txs]) => txs.map((t) => t.id))).toEqual(['t3'])
  })

  it('isFiltered はフィルタが all 以外のとき true になる', () => {
    const { result } = renderHook(() => useTransactionFilters([], '2026-07'))
    expect(result.current.isFiltered).toBe(false)

    act(() => result.current.setTypeFilter('expense'))
    expect(result.current.isFiltered).toBe(true)
  })
})

describe('useTransactionFilters — 日付グルーピング', () => {
  it('同日の取引を1つのグループにまとめ、日付降順で並べる', () => {
    const transactions = [
      makeTx({ id: 't1', date: '2026-07-01', created_at: '2026-07-01T09:00:00Z' }),
      makeTx({ id: 't2', date: '2026-07-01', created_at: '2026-07-01T18:00:00Z' }),
      makeTx({ id: 't3', date: '2026-07-05', created_at: '2026-07-05T00:00:00Z' }),
    ]
    const { result } = renderHook(() => useTransactionFilters(transactions, '2026-07'))
    expect(result.current.grouped.map(([date]) => date)).toEqual(['2026-07-05', '2026-07-01'])
    // 同日内は created_at 降順（後に記録したものが先）
    expect(result.current.grouped[1][1].map((t) => t.id)).toEqual(['t2', 't1'])
  })
})
