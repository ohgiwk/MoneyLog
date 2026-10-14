import { describe, it, expect } from 'vitest'
import {
  addableFixedExpenses,
  buildMonthlySnapshot,
  diffMonthlyRecords,
  fixedTotalsByMonth,
  matchesStatusFilter,
  sortByCategoryOrder,
  summarizeHistory,
  toMonthlyRecord,
} from './fixedExpenseHistory'
import type { FixedExpense, FixedExpenseMonthlyRecord } from './database.types'

function fe(overrides: Partial<FixedExpense>): FixedExpense {
  return {
    id: 'fe-1',
    user_id: 'u1',
    name: '家賃',
    category: '住居費',
    amount: 80000,
    baseline_amount: 80000,
    cycle: 'monthly',
    billing_day: null,
    status: 'active',
    start_date: '2026-01-01',
    notes: null,
    currency: null,
    usd_amount: null,
    loan_start_month: null,
    loan_end_month: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function rec(overrides: Partial<FixedExpenseMonthlyRecord>): FixedExpenseMonthlyRecord {
  return {
    id: 'r-1',
    user_id: 'u1',
    month: '2026-10',
    fixed_expense_id: 'fe-1',
    name: '家賃',
    category: '住居費',
    monthly_amount: 80000,
    created_at: '2026-10-01T00:00:00Z',
    ...overrides,
  }
}

describe('buildMonthlySnapshot', () => {
  it('契約中・見直し中の項目だけを月額換算で記録行にする', () => {
    const rows = buildMonthlySnapshot(
      'u1',
      [
        fe({ id: 'a', status: 'active' }),
        fe({ id: 'b', status: 'reviewing', amount: 1000 }),
        fe({ id: 'c', status: 'cancelled' }),
        fe({ id: 'd', status: 'unsubscribed' }),
      ],
      '2026-10'
    )
    expect(rows.map((r) => r.fixed_expense_id)).toEqual(['a', 'b'])
    expect(rows[0]).toEqual({
      user_id: 'u1',
      month: '2026-10',
      fixed_expense_id: 'a',
      name: '家賃',
      category: '住居費',
      monthly_amount: 80000,
    })
  })

  it('年払いは12で割り、円単位に丸める', () => {
    const [row] = buildMonthlySnapshot('u1', [fe({ cycle: 'yearly', amount: 10000 })], '2026-10')
    expect(row.monthly_amount).toBe(833)
  })

  it('金額が未入力の項目は 0 円で記録する', () => {
    const [row] = buildMonthlySnapshot('u1', [fe({ amount: null })], '2026-10')
    expect(row.monthly_amount).toBe(0)
  })

  it('ローンは分割回数で割り、完済した月以降は含めない', () => {
    const loan = fe({
      category: 'ローン',
      amount: 120000,
      loan_start_month: '2026-01',
      loan_end_month: '2026-12',
    })
    expect(buildMonthlySnapshot('u1', [loan], '2026-12')[0].monthly_amount).toBe(10000)
    expect(buildMonthlySnapshot('u1', [loan], '2027-01')).toEqual([])
  })

  it('固定費がないとき空配列を返す', () => {
    expect(buildMonthlySnapshot('u1', [], '2026-10')).toEqual([])
  })
})

describe('diffMonthlyRecords', () => {
  const snap = (id: string, amount: number, name = '家賃') => ({
    user_id: 'u1',
    month: '2026-10',
    fixed_expense_id: id,
    name,
    category: '住居費',
    monthly_amount: amount,
  })

  it('記録がないときはすべての項目を追加する', () => {
    const s = [snap('a', 100), snap('b', 200)]
    expect(diffMonthlyRecords([], s)).toEqual({ upserts: s, deleteIds: [] })
  })

  it('内容が同じときは何も変更しない', () => {
    const existing = [rec({ id: 'r1', fixed_expense_id: 'a', monthly_amount: 100 })]
    expect(diffMonthlyRecords(existing, [snap('a', 100)])).toEqual({ upserts: [], deleteIds: [] })
  })

  it('金額や名前が変わった項目だけを更新する', () => {
    const existing = [
      rec({ id: 'r1', fixed_expense_id: 'a', monthly_amount: 100 }),
      rec({ id: 'r2', fixed_expense_id: 'b', monthly_amount: 200 }),
      rec({ id: 'r3', fixed_expense_id: 'c', monthly_amount: 300 }),
    ]
    const s = [snap('a', 150), snap('b', 200, '駐車場'), snap('c', 300)]
    expect(diffMonthlyRecords(existing, s).upserts).toEqual([s[0], s[1]])
  })

  it('契約中でなくなった項目と、削除された固定費の行を削除する', () => {
    const existing = [
      rec({ id: 'r1', fixed_expense_id: 'a' }),
      rec({ id: 'r2', fixed_expense_id: 'gone' }),
      rec({ id: 'r3', fixed_expense_id: null }),
    ]
    expect(diffMonthlyRecords(existing, [snap('a', 80000)]).deleteIds).toEqual(['r2', 'r3'])
  })
})

describe('summarizeHistory', () => {
  it('記録がないとき空配列を返す', () => {
    expect(summarizeHistory([])).toEqual([])
  })

  it('最初の記録月は比較対象がなく、差額は null になる', () => {
    const [m] = summarizeHistory([rec({ monthly_amount: 80000 })])
    expect(m).toMatchObject({ month: '2026-10', total: 80000, prevMonth: null, diff: null })
    expect(m.items[0]).toMatchObject({ change: 'same', prevAmount: null })
  })

  it('新しい月から順に、直前の記録月と比べた合計の差額と項目の変化を返す', () => {
    const result = summarizeHistory([
      rec({
        id: '1',
        month: '2026-09',
        fixed_expense_id: 'a',
        name: '家賃',
        monthly_amount: 80000,
      }),
      rec({
        id: '2',
        month: '2026-09',
        fixed_expense_id: 'b',
        name: 'スマホ',
        monthly_amount: 3000,
      }),
      rec({ id: '3', month: '2026-09', fixed_expense_id: 'c', name: '電気', monthly_amount: 5000 }),
      rec({ id: '4', month: '2026-09', fixed_expense_id: 'd', name: '保険', monthly_amount: 4000 }),
      rec({
        id: '5',
        month: '2026-10',
        fixed_expense_id: 'a',
        name: '家賃',
        monthly_amount: 80000,
      }),
      rec({
        id: '6',
        month: '2026-10',
        fixed_expense_id: 'b',
        name: 'スマホ',
        monthly_amount: 2000,
      }),
      rec({ id: '7', month: '2026-10', fixed_expense_id: 'c', name: '電気', monthly_amount: 6000 }),
      rec({ id: '8', month: '2026-10', fixed_expense_id: 'e', name: '動画', monthly_amount: 1000 }),
    ])
    expect(result.map((m) => m.month)).toEqual(['2026-10', '2026-09'])
    const oct = result[0]
    expect(oct).toMatchObject({ total: 89000, prevMonth: '2026-09', diff: -3000 })
    const changes = Object.fromEntries(oct.items.map((it) => [it.name, it.change]))
    expect(changes).toEqual({
      家賃: 'same',
      スマホ: 'down',
      電気: 'up',
      動画: 'new',
      保険: 'ended',
    })
    expect(oct.items[oct.items.length - 1]).toMatchObject({
      name: '保険',
      amount: 0,
      prevAmount: 4000,
    })
  })

  it('記録がない月を挟むときは、記録がある直前の月と比べる', () => {
    const [aug] = summarizeHistory([
      rec({ id: '1', month: '2026-06', monthly_amount: 1000 }),
      rec({ id: '2', month: '2026-08', monthly_amount: 1500 }),
    ])
    expect(aug).toMatchObject({ month: '2026-08', prevMonth: '2026-06', diff: 500 })
  })

  it('削除された固定費（id が null）は名前とカテゴリで前の月と突き合わせる', () => {
    const [oct] = summarizeHistory([
      rec({ id: '1', month: '2026-09', fixed_expense_id: null, monthly_amount: 1000 }),
      rec({ id: '2', month: '2026-10', fixed_expense_id: null, monthly_amount: 1000 }),
    ])
    expect(oct.items).toHaveLength(1)
    expect(oct.items[0].change).toBe('same')
  })

  it('DB から文字列で返った金額も数値として集計する', () => {
    const [m] = summarizeHistory([
      rec({ monthly_amount: '1200' as unknown as number }),
      rec({ id: 'r-2', fixed_expense_id: 'fe-2', monthly_amount: 300 }),
    ])
    expect(m.total).toBe(1500)
  })
})

describe('toMonthlyRecord', () => {
  it('解約済みなど状態にかかわらず、設定を指定した月の記録行にする', () => {
    expect(
      toMonthlyRecord(
        'u1',
        fe({ id: 'x', status: 'cancelled', cycle: 'yearly', amount: 12000 }),
        '2026-08'
      )
    ).toEqual({
      user_id: 'u1',
      month: '2026-08',
      fixed_expense_id: 'x',
      name: '家賃',
      category: '住居費',
      monthly_amount: 1000,
    })
  })
})

describe('addableFixedExpenses', () => {
  it('その月にまだ記録がない設定だけを返す', () => {
    const list = [fe({ id: 'a' }), fe({ id: 'b' }), fe({ id: 'c' })]
    const result = addableFixedExpenses(list, [
      { fixed_expense_id: 'b' },
      { fixed_expense_id: null },
    ])
    expect(result.map((f) => f.id)).toEqual(['a', 'c'])
  })

  it('記録がない月はすべての設定を返す', () => {
    expect(addableFixedExpenses([fe({ id: 'a' })], [])).toHaveLength(1)
  })
})

describe('summarizeHistory の recordId', () => {
  it('その月の項目には記録行の id、終了した項目には null を付ける', () => {
    const [oct] = summarizeHistory([
      rec({ id: 'r-sep', month: '2026-09', fixed_expense_id: 'a', name: '保険' }),
      rec({ id: 'r-oct', month: '2026-10', fixed_expense_id: 'b', name: '家賃' }),
    ])
    const ids = Object.fromEntries(oct.items.map((it) => [it.name, it.recordId]))
    expect(ids).toEqual({ 家賃: 'r-oct', 保険: null })
  })
})

describe('sortByCategoryOrder', () => {
  const order = ['住居費', '通信費', 'サブスク']

  it('カテゴリ設定の順に並べ、同じカテゴリの中では元の順を保つ', () => {
    const list = [
      { name: 'Netflix', category: 'サブスク' },
      { name: 'スマホ', category: '通信費' },
      { name: 'Spotify', category: 'サブスク' },
      { name: '家賃', category: '住居費' },
    ]
    expect(sortByCategoryOrder(list, order).map((x) => x.name)).toEqual([
      '家賃',
      'スマホ',
      'Netflix',
      'Spotify',
    ])
  })

  it('設定にないカテゴリは最後に並べる', () => {
    const list = [
      { name: 'A', category: '不明' },
      { name: 'B', category: '通信費' },
    ]
    expect(sortByCategoryOrder(list, order).map((x) => x.name)).toEqual(['B', 'A'])
  })

  it('元の配列を書き換えない', () => {
    const list = [
      { name: 'A', category: 'サブスク' },
      { name: 'B', category: '住居費' },
    ]
    sortByCategoryOrder(list, order)
    expect(list.map((x) => x.name)).toEqual(['A', 'B'])
  })
})

describe('matchesStatusFilter', () => {
  const statuses = ['active', 'reviewing', 'unsubscribed', 'cancelled'] as const
  const pick = (filter: Parameters<typeof matchesStatusFilter>[1]) =>
    statuses.filter((status) => matchesStatusFilter({ status }, filter))

  it('すべてのときは全ステータスを含める', () => {
    expect(pick('all')).toEqual(statuses)
  })

  it('契約中のときは見直し中も含める', () => {
    expect(pick('active')).toEqual(['active', 'reviewing'])
  })

  it('未契約・解約済みのときはそのステータスだけを含める', () => {
    expect(pick('unsubscribed')).toEqual(['unsubscribed'])
    expect(pick('cancelled')).toEqual(['cancelled'])
  })
})

describe('fixedTotalsByMonth', () => {
  it('月ごとに記録の金額を合計する', () => {
    const totals = fixedTotalsByMonth([
      { month: '2026-09', monthly_amount: 80000 },
      { month: '2026-09', monthly_amount: 3000 },
      { month: '2026-10', monthly_amount: 50000 },
    ])
    expect(Object.fromEntries(totals)).toEqual({ '2026-09': 83000, '2026-10': 50000 })
  })

  it('DB から文字列で返った金額も数値として合計する', () => {
    const totals = fixedTotalsByMonth([
      { month: '2026-09', monthly_amount: '1200' as unknown as number },
      { month: '2026-09', monthly_amount: 300 },
    ])
    expect(totals.get('2026-09')).toBe(1500)
  })

  it('記録がないとき空の Map を返す', () => {
    expect(fixedTotalsByMonth([]).size).toBe(0)
  })
})
