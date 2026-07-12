import { describe, it, expect, beforeEach } from 'vitest'
import {
  DEFAULT_USD_JPY_RATE,
  getUsdJpyRate,
  setUsdJpyRate,
  setExpenseCurrencyMeta,
  removeExpenseCurrencyMeta,
  getExpenseCurrencyMeta,
  getAllCurrencyMeta,
} from './exchangeRate'

beforeEach(() => {
  localStorage.clear()
})

describe('getUsdJpyRate / setUsdJpyRate', () => {
  it('未設定のときはデフォルトレートを返す', () => {
    expect(getUsdJpyRate()).toBe(DEFAULT_USD_JPY_RATE)
  })

  it('setUsdJpyRate で保存したレートを取得できる', () => {
    setUsdJpyRate(155.5)
    expect(getUsdJpyRate()).toBe(155.5)
  })
})

describe('通貨メタ情報', () => {
  it('未設定の expenseId は null を返す', () => {
    expect(getExpenseCurrencyMeta('e1')).toBeNull()
  })

  it('setExpenseCurrencyMeta で保存した情報を取得できる', () => {
    setExpenseCurrencyMeta('e1', { currency: 'USD', usdAmount: 9.99 })
    expect(getExpenseCurrencyMeta('e1')).toEqual({ currency: 'USD', usdAmount: 9.99 })
  })

  it('複数の expenseId を個別に管理できる', () => {
    setExpenseCurrencyMeta('e1', { currency: 'USD', usdAmount: 9.99 })
    setExpenseCurrencyMeta('e2', { currency: 'USD', usdAmount: 14.99 })
    expect(getAllCurrencyMeta()).toEqual({
      e1: { currency: 'USD', usdAmount: 9.99 },
      e2: { currency: 'USD', usdAmount: 14.99 },
    })
  })

  it('removeExpenseCurrencyMeta で指定した expenseId のみ削除する', () => {
    setExpenseCurrencyMeta('e1', { currency: 'USD', usdAmount: 9.99 })
    setExpenseCurrencyMeta('e2', { currency: 'USD', usdAmount: 14.99 })

    removeExpenseCurrencyMeta('e1')

    expect(getExpenseCurrencyMeta('e1')).toBeNull()
    expect(getExpenseCurrencyMeta('e2')).toEqual({ currency: 'USD', usdAmount: 14.99 })
  })

  it('保存データが不正な JSON の場合は空のマップとして扱う', () => {
    localStorage.setItem('moneylog_expense_currency', 'invalid json')
    expect(getAllCurrencyMeta()).toEqual({})
  })
})
