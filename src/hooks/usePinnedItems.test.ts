import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { Transaction } from '../lib/database.types'
import {
  draftFromTx,
  migratePinnedPresets,
  pinnedItemToTx,
  readPinnedItems,
  renamePinnedItemCategory,
  usePinnedItems,
  type PinnedItemDraft,
} from './usePinnedItems'
import { expenseKey } from '../utils'

const draft: PinnedItemDraft = {
  name: 'いつもの昼',
  category: '食費',
  amount: 500,
  memo: 'ランチ',
  store_type: 'コンビニ',
  meal_type: '昼食',
  payment_type: 'qr',
  payment_method: 'PayPay',
}

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx1',
    user_id: 'u1',
    type: 'expense',
    expense_kind: 'one_time',
    date: '2026-10-01',
    category: '食費',
    amount: 500,
    memo: 'ランチ',
    store_type: 'コンビニ',
    meal_type: '昼食',
    payment_type: 'qr',
    payment_method: 'PayPay',
    created_at: '2026-10-01T00:00:00Z',
    ...overrides,
  }
}

beforeEach(() => {
  localStorage.clear()
})

describe('usePinnedItems', () => {
  it('追加した項目が保存され、次に読み込んだときも残っている', () => {
    const { result } = renderHook(() => usePinnedItems('u1'))
    act(() => result.current.addItem(draft))
    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0]).toMatchObject(draft)
    expect(readPinnedItems('u1')).toEqual(result.current.items)
  })

  it('編集すると id はそのままで内容だけが置き換わる', () => {
    const { result } = renderHook(() => usePinnedItems('u1'))
    act(() => result.current.addItem(draft))
    const id = result.current.items[0].id
    act(() =>
      result.current.updateItem(id, { ...draft, category: '日用品', store_type: null, amount: 800 })
    )
    expect(result.current.items).toEqual([
      { ...draft, id, category: '日用品', store_type: null, amount: 800 },
    ])
  })

  it('削除した項目だけがなくなる', () => {
    const { result } = renderHook(() => usePinnedItems('u1'))
    act(() => result.current.addItem(draft))
    act(() => result.current.addItem({ ...draft, name: '夜' }))
    const [first, second] = result.current.items
    act(() => result.current.removeItem(first.id))
    expect(result.current.items).toEqual([second])
  })

  it('同じユーザーの別インスタンスにも変更が反映され、別ユーザーには反映されない', () => {
    const a = renderHook(() => usePinnedItems('u1'))
    const same = renderHook(() => usePinnedItems('u1'))
    const other = renderHook(() => usePinnedItems('u2'))
    act(() => a.result.current.addItem(draft))
    expect(same.result.current.items).toHaveLength(1)
    expect(other.result.current.items).toEqual([])
  })

  it('保存データが壊れているときは空として扱う', () => {
    localStorage.setItem('qrpin_u1', '{broken')
    expect(readPinnedItems('u1')).toEqual([])
  })
})

describe('expenseKey / draftFromTx / pinnedItemToTx', () => {
  it('メモが null のときは空文字としてキーを作る', () => {
    expect(expenseKey({ category: '食費', amount: 500, memo: null })).toBe('食費|500|')
  })

  it('記録からピン留めの内容を作る', () => {
    expect(draftFromTx(makeTx(), '昼')).toEqual({ ...draft, name: '昼' })
  })

  it('ピン留めを今日の臨時出費の記録に変換する', () => {
    expect(pinnedItemToTx({ ...draft, id: 'p1' }, 'u1', '2026-10-13')).toEqual({
      id: 'p1',
      user_id: 'u1',
      type: 'expense',
      expense_kind: 'one_time',
      date: '2026-10-13',
      category: '食費',
      amount: 500,
      memo: 'ランチ',
      store_type: 'コンビニ',
      meal_type: '昼食',
      payment_type: 'qr',
      payment_method: 'PayPay',
      created_at: '',
    })
  })
})

describe('migratePinnedPresets', () => {
  it('旧形式のピン留めを、元の記録の店舗種別・決済方法ごと項目に移す', () => {
    localStorage.setItem(
      'qrp_u1',
      JSON.stringify({ '食費|500|ランチ': { name: 'いつもの昼', pinned: true } })
    )
    migratePinnedPresets('u1', [makeTx()])
    expect(readPinnedItems('u1')).toEqual([{ ...draft, id: expect.any(String) }])
    // ピンの印は外れ、表示名は「よく使う」側のために残る
    expect(JSON.parse(localStorage.getItem('qrp_u1')!)).toEqual({
      '食費|500|ランチ': { name: 'いつもの昼' },
    })
  })

  it('元の記録が見つからないときはキーから復元する（メモに | が含まれていても崩れない）', () => {
    localStorage.setItem('qrp_u1', JSON.stringify({ '交通費|1200|A|B': { pinned: true } }))
    migratePinnedPresets('u1', [])
    expect(readPinnedItems('u1')).toEqual([
      {
        id: expect.any(String),
        name: null,
        category: '交通費',
        amount: 1200,
        memo: 'A|B',
        store_type: null,
        meal_type: null,
        payment_type: null,
        payment_method: null,
      },
    ])
    expect(JSON.parse(localStorage.getItem('qrp_u1')!)).toEqual({})
  })

  it('二度呼んでも二重には移行されない', () => {
    localStorage.setItem('qrp_u1', JSON.stringify({ '食費|500|ランチ': { pinned: true } }))
    migratePinnedPresets('u1', [makeTx()])
    migratePinnedPresets('u1', [makeTx()])
    expect(readPinnedItems('u1')).toHaveLength(1)
  })

  it('ピン留めのないプリセットと既存の項目には手を付けない', () => {
    localStorage.setItem('qrp_u1', JSON.stringify({ '日用品|200|': { name: '洗剤' } }))
    localStorage.setItem('qrpin_u1', JSON.stringify([{ ...draft, id: 'p1' }]))
    migratePinnedPresets('u1', [makeTx()])
    expect(readPinnedItems('u1')).toEqual([{ ...draft, id: 'p1' }])
    expect(JSON.parse(localStorage.getItem('qrp_u1')!)).toEqual({ '日用品|200|': { name: '洗剤' } })
  })
})

describe('renamePinnedItemCategory', () => {
  it('該当カテゴリの項目だけ名前が変わる', () => {
    localStorage.setItem(
      'qrpin_u1',
      JSON.stringify([
        { ...draft, id: 'p1' },
        { ...draft, id: 'p2', category: '日用品' },
      ])
    )
    renamePinnedItemCategory('u1', '食費', '食料品')
    expect(readPinnedItems('u1').map((i) => i.category)).toEqual(['食料品', '日用品'])
  })
})
