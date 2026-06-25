import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCategories } from './useCategories'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, FIXED_EXPENSE_CATEGORIES } from '../constants'

beforeEach(() => {
  localStorage.clear()
})

describe('useCategories — 初期値', () => {
  it('localStorage が空のときデフォルトのカテゴリを返す', () => {
    const { result } = renderHook(() => useCategories())
    expect(result.current.expenseCategories).toEqual(EXPENSE_CATEGORIES)
    expect(result.current.incomeCategories).toEqual(INCOME_CATEGORIES)
    expect(result.current.fixedCategories).toEqual(FIXED_EXPENSE_CATEGORIES)
  })

  it('localStorage に保存済みのカテゴリがあればそれを返す', () => {
    const saved = [{ name: 'カスタム', icon: '🎯', color: '#ff0000' }]
    localStorage.setItem('moneylog_expense_categories', JSON.stringify(saved))

    const { result } = renderHook(() => useCategories())
    expect(result.current.expenseCategories).toEqual(saved)
  })

  it('localStorage の値が不正な JSON の場合はデフォルトにフォールバックする', () => {
    localStorage.setItem('moneylog_expense_categories', 'invalid json')

    const { result } = renderHook(() => useCategories())
    expect(result.current.expenseCategories).toEqual(EXPENSE_CATEGORIES)
  })
})

describe('useCategories — 更新', () => {
  it('updateExpenseCategories で支出カテゴリを更新して localStorage に保存する', () => {
    const { result } = renderHook(() => useCategories())
    const newCats = [{ name: '新カテゴリ', icon: '🆕', color: '#123456' }]

    act(() => {
      result.current.updateExpenseCategories(newCats)
    })

    expect(result.current.expenseCategories).toEqual(newCats)
    expect(JSON.parse(localStorage.getItem('moneylog_expense_categories')!)).toEqual(newCats)
  })

  it('updateIncomeCategories で収入カテゴリを更新して localStorage に保存する', () => {
    const { result } = renderHook(() => useCategories())
    const newCats = [{ name: '新収入', icon: '💵', color: '#00ff00' }]

    act(() => {
      result.current.updateIncomeCategories(newCats)
    })

    expect(result.current.incomeCategories).toEqual(newCats)
    expect(JSON.parse(localStorage.getItem('moneylog_income_categories')!)).toEqual(newCats)
  })

  it('updateFixedCategories で固定費カテゴリを更新して localStorage に保存する', () => {
    const { result } = renderHook(() => useCategories())
    const newCats = [{ name: '新固定費', icon: '🏷️', color: '#0000ff' }]

    act(() => {
      result.current.updateFixedCategories(newCats)
    })

    expect(result.current.fixedCategories).toEqual(newCats)
    expect(JSON.parse(localStorage.getItem('moneylog_fixed_categories')!)).toEqual(newCats)
  })

  it('各カテゴリの更新は互いに影響しない', () => {
    const { result } = renderHook(() => useCategories())
    const newExpense = [{ name: '食費だけ変更', icon: '🍱', color: '#aaaaaa' }]

    act(() => {
      result.current.updateExpenseCategories(newExpense)
    })

    expect(result.current.incomeCategories).toEqual(INCOME_CATEGORIES)
    expect(result.current.fixedCategories).toEqual(FIXED_EXPENSE_CATEGORIES)
  })
})

describe('useCategories — 再マウント時の永続化', () => {
  it('更新後に再マウントしても保存した値が復元される', () => {
    const saved = [{ name: '永続テスト', icon: '💾', color: '#999999' }]

    const { result: first } = renderHook(() => useCategories())
    act(() => {
      first.current.updateExpenseCategories(saved)
    })

    const { result: second } = renderHook(() => useCategories())
    expect(second.current.expenseCategories).toEqual(saved)
  })
})
