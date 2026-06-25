import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { todayStr, monthKey, formatYen, monthLabel, shiftMonth, categoryInfo } from './utils'

describe('todayStr', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('YYYY-MM-DD 形式の今日の日付を返す', () => {
    vi.setSystemTime(new Date('2024-03-15T12:00:00Z'))
    expect(todayStr()).toBe('2024-03-15')
  })
})

describe('monthKey', () => {
  it('日付文字列から YYYY-MM を返す', () => {
    expect(monthKey('2024-03-15')).toBe('2024-03')
  })

  it('月初の日付でも正しく返す', () => {
    expect(monthKey('2024-01-01')).toBe('2024-01')
  })
})

describe('formatYen', () => {
  it('整数を円フォーマットに変換する', () => {
    expect(formatYen(1000)).toBe('¥1,000')
  })

  it('小数点以下を丸める', () => {
    expect(formatYen(1234.7)).toBe('¥1,235')
    expect(formatYen(1234.4)).toBe('¥1,234')
  })

  it('0 を正しくフォーマットする', () => {
    expect(formatYen(0)).toBe('¥0')
  })

  it('大きな金額を3桁区切りでフォーマットする', () => {
    expect(formatYen(1000000)).toBe('¥1,000,000')
  })
})

describe('monthLabel', () => {
  it('YYYY-MM を「YYYY年M月」形式に変換する', () => {
    expect(monthLabel('2024-03')).toBe('2024年3月')
  })

  it('月の先頭ゼロを除去する', () => {
    expect(monthLabel('2024-01')).toBe('2024年1月')
  })

  it('12月を正しく変換する', () => {
    expect(monthLabel('2024-12')).toBe('2024年12月')
  })
})

describe('shiftMonth', () => {
  it('+1 で翌月を返す', () => {
    expect(shiftMonth('2024-03', 1)).toBe('2024-04')
  })

  it('-1 で前月を返す', () => {
    expect(shiftMonth('2024-03', -1)).toBe('2024-02')
  })

  it('12月 +1 で翌年1月を返す', () => {
    expect(shiftMonth('2024-12', 1)).toBe('2025-01')
  })

  it('1月 -1 で前年12月を返す', () => {
    expect(shiftMonth('2024-01', -1)).toBe('2023-12')
  })

  it('delta 0 で同月を返す', () => {
    expect(shiftMonth('2024-06', 0)).toBe('2024-06')
  })

  it('複数月のシフトが正しい', () => {
    expect(shiftMonth('2024-03', 10)).toBe('2025-01')
  })
})

describe('categoryInfo', () => {
  it('登録済みカテゴリの情報を返す', () => {
    const info = categoryInfo('食費')
    expect(info.name).toBe('食費')
    expect(info.icon).toBe('🍙')
    expect(info.color).toBe('#f97316')
  })

  it('未登録カテゴリはフォールバック値を返す', () => {
    const info = categoryInfo('存在しないカテゴリ')
    expect(info.name).toBe('存在しないカテゴリ')
    expect(info.icon).toBe('📦')
    expect(info.color).toBe('#64748b')
  })
})
