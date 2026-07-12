import { ALL_CATEGORIES, type CategoryInfo } from './constants'
import type { Consumable } from './lib/database.types'

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7)
}

// 月曜=0始まりの曜日インデックス（Date.getDay() は日曜=0始まりのため変換）
export function mondayFirstDow(date: Date): number {
  return (date.getDay() + 6) % 7
}

// 予算に対する使用率(%, 0-100)と超過フラグ
export function calcBudgetProgress(spent: number, budget: number): { pct: number; over: boolean } {
  return {
    pct: budget > 0 ? Math.min((spent / budget) * 100, 100) : 0,
    over: spent > budget && budget > 0,
  }
}

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

// 「M月D日（曜）」形式の日付表示
export function formatDateWithWeekday(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}月${d.getDate()}日（${DAY_LABELS[d.getDay()]}）`
}

export function formatYen(n: number): string {
  return '¥' + Math.round(n).toLocaleString('ja-JP')
}

export function monthLabel(ym: string): string {
  const [y, m] = ym.split('-')
  return `${y}年${parseInt(m, 10)}月`
}

export function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// startDay を起点とした集計期間のキー（例: startDay=25 なら 3/25〜4/24 は '2024-03'）
export function periodKey(dateStr: string, startDay: number): string {
  if (startDay <= 1) return dateStr.slice(0, 7)
  const ym = dateStr.slice(0, 7)
  const day = Number(dateStr.slice(8, 10))
  return day >= startDay ? ym : shiftMonth(ym, -1)
}

// periodKey が表す集計期間の実際の日付範囲
export function periodRange(periodYm: string, startDay: number): { from: string; to: string } {
  if (startDay <= 1) {
    const [y, m] = periodYm.split('-').map(Number)
    const lastDay = new Date(y, m, 0).getDate()
    return { from: `${periodYm}-01`, to: `${periodYm}-${String(lastDay).padStart(2, '0')}` }
  }
  const [y, m] = periodYm.split('-').map(Number)
  const startDayClamped = Math.min(startDay, new Date(y, m, 0).getDate())
  const from = `${periodYm}-${String(startDayClamped).padStart(2, '0')}`

  const nextYm = shiftMonth(periodYm, 1)
  const [ny, nm] = nextYm.split('-').map(Number)
  const nextStartDayClamped = Math.min(startDay, new Date(ny, nm, 0).getDate())
  const toDate = new Date(ny, nm - 1, nextStartDayClamped)
  toDate.setDate(toDate.getDate() - 1)
  const to = toDate.toISOString().slice(0, 10)

  return { from, to }
}

// 集計期間の初日から数えた経過日数（1始まり）
export function periodDayIndex(dateStr: string, periodYm: string, startDay: number): number {
  const { from } = periodRange(periodYm, startDay)
  const diff = (new Date(dateStr).getTime() - new Date(from).getTime()) / 86400000
  return Math.round(diff) + 1
}

// 集計期間の総日数
export function periodDayCount(periodYm: string, startDay: number): number {
  const { from, to } = periodRange(periodYm, startDay)
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1
}

export function categoryInfo(name: string): CategoryInfo {
  return ALL_CATEGORIES.find((c) => c.name === name) ?? { name, icon: '📦', color: '#64748b' }
}

export function effectiveCycleDays(c: Consumable, householdMembers: number): number {
  return c.members_scale ? Math.ceil(c.cycle_days / householdMembers) : c.cycle_days
}

export function nextPurchaseDate(c: Consumable, householdMembers: number): Date {
  const base = new Date(c.last_purchased)
  base.setDate(base.getDate() + effectiveCycleDays(c, householdMembers))
  return base
}

export function monthlyConsumableCost(c: Consumable, householdMembers: number): number {
  const cycle = effectiveCycleDays(c, householdMembers)
  return Math.round((c.amount * c.quantity) / (cycle / 30))
}

export function daysUntil(date: Date): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((date.getTime() - today.getTime()) / 86400000)
}
