import { ALL_CATEGORIES, type CategoryInfo } from './constants'

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7)
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

export function categoryInfo(name: string): CategoryInfo {
  return ALL_CATEGORIES.find((c) => c.name === name) ?? { name, icon: '📦', color: '#64748b' }
}
