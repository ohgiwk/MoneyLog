import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  todayStr,
  monthKey,
  formatYen,
  monthLabel,
  shiftMonth,
  categoryInfo,
  mondayFirstDow,
  calcBudgetProgress,
  formatDateWithWeekday,
  periodKey,
  periodRange,
  periodDayIndex,
  periodDayCount,
  effectiveCycleDays,
  nextPurchaseDate,
  monthlyConsumableCost,
  daysUntil,
} from './utils'
import type { Consumable } from './lib/database.types'

function makeConsumable(overrides: Partial<Consumable> = {}): Consumable {
  return {
    id: 'cs-1',
    user_id: 'u1',
    name: 'テスト',
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

describe('mondayFirstDow', () => {
  it('月曜日のとき 0 を返す', () => {
    expect(mondayFirstDow(new Date(2026, 6, 6))).toBe(0)
  })
  it('水曜日のとき 2 を返す', () => {
    expect(mondayFirstDow(new Date(2026, 6, 8))).toBe(2)
  })
  it('日曜日のとき 6 を返す', () => {
    expect(mondayFirstDow(new Date(2026, 6, 5))).toBe(6)
  })
})

describe('calcBudgetProgress', () => {
  it('支出が予算の半分のとき pct=50, over=false', () => {
    expect(calcBudgetProgress(50, 100)).toEqual({ pct: 50, over: false })
  })
  it('支出と予算が同額のとき pct=100, over=false', () => {
    expect(calcBudgetProgress(100, 100)).toEqual({ pct: 100, over: false })
  })
  it('支出が予算を超えたとき pct=100(上限), over=true', () => {
    expect(calcBudgetProgress(150, 100)).toEqual({ pct: 100, over: true })
  })
  it('budget=0 のとき pct=0, over=false', () => {
    expect(calcBudgetProgress(100, 0)).toEqual({ pct: 0, over: false })
  })
})

describe('formatDateWithWeekday', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('今日の日付を渡すと「今日（曜）」を返す', () => {
    vi.setSystemTime(new Date('2026-07-10T00:00:00Z'))
    expect(formatDateWithWeekday('2026-07-10')).toBe('今日（金）')
  })
  it('昨日の日付を渡すと「昨日（曜）」を返す', () => {
    vi.setSystemTime(new Date('2026-07-10T00:00:00Z'))
    expect(formatDateWithWeekday('2026-07-09')).toBe('昨日（木）')
  })
  it('今日・昨日以外の日付は「M月D日（曜）」形式で返す', () => {
    vi.setSystemTime(new Date('2026-07-10T00:00:00Z'))
    expect(formatDateWithWeekday('2026-07-01')).toBe('7月1日（水）')
  })
})

describe('periodKey', () => {
  it('startDay=1 のとき日付の YYYY-MM をそのまま返す', () => {
    expect(periodKey('2026-07-15', 1)).toBe('2026-07')
  })
  it('startDay=25: 25日以降は同月のキーを返す', () => {
    expect(periodKey('2026-07-25', 25)).toBe('2026-07')
  })
  it('startDay=25: 25日未満は前月のキーを返す', () => {
    expect(periodKey('2026-07-24', 25)).toBe('2026-06')
  })
  it('startDay=25: 翌月1日は前月のキーを返す', () => {
    expect(periodKey('2026-08-01', 25)).toBe('2026-07')
  })
})

describe('periodRange', () => {
  it('startDay=1 のとき月初〜月末の日付範囲を返す', () => {
    expect(periodRange('2026-07', 1)).toEqual({ from: '2026-07-01', to: '2026-07-31' })
  })
  it('startDay=25 のとき from は当月 25 日から始まる', () => {
    // to はローカル時刻→ISOString変換を経るためタイムゾーン依存。from のみ検証する
    expect(periodRange('2026-07', 25).from).toBe('2026-07-25')
  })
})

describe('periodDayIndex', () => {
  it('集計期間の初日のインデックスは 1', () => {
    expect(periodDayIndex('2026-07-25', '2026-07', 25)).toBe(1)
  })
  it('初日から 7 日後のインデックスは 8', () => {
    expect(periodDayIndex('2026-08-01', '2026-07', 25)).toBe(8)
  })
})

describe('periodDayCount', () => {
  it('startDay=1 のとき 7月 の総日数は 31', () => {
    expect(periodDayCount('2026-07', 1)).toBe(31)
  })
  it('startDay=1 のとき 2月 の総日数は 28（2026年は非うるう年）', () => {
    expect(periodDayCount('2026-02', 1)).toBe(28)
  })
})

describe('effectiveCycleDays', () => {
  it('members_scale=false のとき cycle_days をそのまま返す', () => {
    const c = makeConsumable({ cycle_days: 30, members_scale: false })
    expect(effectiveCycleDays(c, 3)).toBe(30)
  })
  it('members_scale=true のとき cycle_days を人数で割って切り上げる', () => {
    const c = makeConsumable({ cycle_days: 30, members_scale: true })
    expect(effectiveCycleDays(c, 3)).toBe(10)
  })
})

describe('nextPurchaseDate', () => {
  it('last_purchased から effectiveCycleDays 日後の日付を返す', () => {
    const c = makeConsumable({ last_purchased: '2026-07-01', cycle_days: 30, members_scale: false })
    const result = nextPurchaseDate(c, 1)
    const expected = new Date('2026-07-01')
    expected.setDate(expected.getDate() + 30)
    expect(result.getTime()).toBe(expected.getTime())
  })
  it('members_scale=true のとき按分後のサイクルで次回日付を計算する', () => {
    const c = makeConsumable({ last_purchased: '2026-07-01', cycle_days: 30, members_scale: true })
    const result = nextPurchaseDate(c, 3)
    // effectiveCycleDays = ceil(30/3) = 10
    const expected = new Date('2026-07-01')
    expected.setDate(expected.getDate() + 10)
    expect(result.getTime()).toBe(expected.getTime())
  })
})

describe('monthlyConsumableCost', () => {
  it('members_scale=false のとき月額コストを返す', () => {
    const c = makeConsumable({ amount: 300, quantity: 1, cycle_days: 30, members_scale: false })
    expect(monthlyConsumableCost(c, 1)).toBe(300)
  })
  it('members_scale=true のとき人数按分後のサイクルで月額コストを計算する', () => {
    const c = makeConsumable({ amount: 900, quantity: 1, cycle_days: 30, members_scale: true })
    // effectiveCycleDays = ceil(30/3) = 10, cost = 900 / (10/30) = 2700
    expect(monthlyConsumableCost(c, 3)).toBe(2700)
  })
})

describe('daysUntil', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('未来の日付のとき正の残り日数を返す', () => {
    vi.setSystemTime(new Date(2026, 6, 10, 12, 0, 0))
    expect(daysUntil(new Date(2026, 6, 15))).toBe(5)
  })
  it('過去の日付のとき負の日数を返す', () => {
    vi.setSystemTime(new Date(2026, 6, 10, 12, 0, 0))
    expect(daysUntil(new Date(2026, 6, 5))).toBe(-5)
  })
  it('今日の日付のとき 0 を返す', () => {
    vi.setSystemTime(new Date(2026, 6, 10, 12, 0, 0))
    expect(daysUntil(new Date(2026, 6, 10))).toBe(0)
  })
})
