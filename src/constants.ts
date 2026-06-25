export interface CategoryInfo {
  name: string
  icon: string
  color: string
}

export const EXPENSE_CATEGORIES: CategoryInfo[] = [
  { name: '食費', icon: '🍙', color: '#f97316' },
  { name: '日用品', icon: '🧻', color: '#0ea5e9' },
  { name: '交通費', icon: '🚃', color: '#6366f1' },
  { name: '住居費', icon: '🏠', color: '#8b5cf6' },
  { name: '通信費', icon: '📱', color: '#06b6d4' },
  { name: '娯楽', icon: '🎮', color: '#ec4899' },
  { name: '医療費', icon: '🏥', color: '#ef4444' },
  { name: '衣服・美容', icon: '👗', color: '#d946ef' },
  { name: '教育', icon: '📚', color: '#3b82f6' },
  { name: 'その他', icon: '📦', color: '#64748b' },
]

export const INCOME_CATEGORIES: CategoryInfo[] = [
  { name: '給与', icon: '💰', color: '#16a34a' },
  { name: '副業', icon: '💻', color: '#0d9488' },
  { name: '臨時収入', icon: '🎁', color: '#ca8a04' },
  { name: 'その他収入', icon: '📦', color: '#64748b' },
]

export const FIXED_EXPENSE_CATEGORIES: CategoryInfo[] = [
  { name: '住居費', icon: '🏠', color: '#8b5cf6' },
  { name: '光熱費', icon: '⚡', color: '#f59e0b' },
  { name: '通信費', icon: '📱', color: '#06b6d4' },
  { name: '税金', icon: '🏛️', color: '#a16207' },
  { name: '保険', icon: '🛡️', color: '#10b981' },
  { name: 'ローン', icon: '🏦', color: '#6366f1' },
  { name: '自動車', icon: '🚗', color: '#78716c' },
  { name: 'サブスク', icon: '🎬', color: '#ec4899' },
  { name: '寄付金', icon: '🎗️', color: '#f43f5e' },
  { name: 'その他固定費', icon: '📦', color: '#64748b' },
]

export const ALL_CATEGORIES: CategoryInfo[] = [
  ...EXPENSE_CATEGORIES,
  ...INCOME_CATEGORIES,
  ...FIXED_EXPENSE_CATEGORIES,
]

export interface DefaultFixedExpense {
  name: string
  category: string
  cycle: 'monthly' | 'yearly'
}

export const DEFAULT_FIXED_EXPENSES: DefaultFixedExpense[] = [
  { name: '家賃', category: '住居費', cycle: 'monthly' },
  { name: '電気代', category: '光熱費', cycle: 'monthly' },
  { name: 'ガス代', category: '光熱費', cycle: 'monthly' },
  { name: '水道代', category: '光熱費', cycle: 'monthly' },
  { name: 'スマホ代', category: '通信費', cycle: 'monthly' },
  { name: 'インターネット', category: '通信費', cycle: 'monthly' },
  { name: '生命保険', category: '保険', cycle: 'monthly' },
  { name: '医療保険', category: '保険', cycle: 'monthly' },
  { name: '駐車場代', category: '自動車', cycle: 'monthly' },
  { name: '自動車保険', category: '自動車', cycle: 'monthly' },
  { name: '自動車ローン', category: '自動車', cycle: 'monthly' },
  { name: 'NHK受信料', category: 'その他固定費', cycle: 'monthly' },
]

export interface SubscriptionPreset {
  name: string
  amount: number
  yearlyAmount?: number
  cycle: 'monthly' | 'yearly'
  subcategory: string
}

import subcategoriesJson from './data/subscription-subcategories.json'
import presetsJson from './data/subscription-presets.json'

export const SUBSCRIPTION_SUBCATEGORIES: { name: string; icon: string }[] = subcategoriesJson

export const SUBSCRIPTION_PRESETS: SubscriptionPreset[] = presetsJson as SubscriptionPreset[]

export const CONSUMABLE_CATEGORIES: CategoryInfo[] = [
  { name: '衛生・清潔', icon: '🪥', color: '#0ea5e9' },
  { name: 'トイレ・洗剤', icon: '🧻', color: '#06b6d4' },
  { name: 'サプリ・医療', icon: '💊', color: '#10b981' },
  { name: '食品・調味料', icon: '🍙', color: '#f97316' },
  { name: 'その他消耗品', icon: '📦', color: '#64748b' },
]

export const CONSUMABLE_CYCLE_PRESETS = [
  { label: '1週間', days: 7 },
  { label: '2週間', days: 14 },
  { label: '1ヶ月', days: 30 },
  { label: '2ヶ月', days: 60 },
  { label: '3ヶ月', days: 90 },
  { label: '半年', days: 180 },
]

export const STATUS_LABELS = {
  active: { label: '契約中', color: 'text-emerald-600 bg-emerald-50' },
  reviewing: { label: '見直し中', color: 'text-amber-600 bg-amber-50' },
  cancelled: { label: '解約済み', color: 'text-slate-400 bg-slate-100' },
  unsubscribed: { label: '未契約', color: 'text-blue-500 bg-blue-50' },
} as const
