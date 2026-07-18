export interface CategoryInfo {
  name: string
  icon: string
  color: string
}

export const EXPENSE_CATEGORIES: CategoryInfo[] = [
  { name: '食費', icon: '🍙', color: '#f97316' },
  { name: '日用品', icon: '🧻', color: '#0ea5e9' },
  { name: '交通費', icon: '🚃', color: '#6366f1' },
  { name: '娯楽', icon: '🎮', color: '#ec4899' },
  { name: '医療費', icon: '🏥', color: '#ef4444' },
  { name: '衣服・美容', icon: '👗', color: '#d946ef' },
  { name: '自己投資', icon: '📚', color: '#3b82f6' },
  { name: '子ども・育児', icon: '👶', color: '#f59e0b' },
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
  { name: '子ども・育児', icon: '👶', color: '#f59e0b' },
  { name: '自己投資', icon: '📚', color: '#3b82f6' },
  { name: '寄付金', icon: '🎗️', color: '#f43f5e' },
  { name: 'その他', icon: '📦', color: '#64748b' },
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
  { name: '保育園・幼稚園代', category: '子ども・育児', cycle: 'monthly' },
  { name: '学校関連費', category: '子ども・育児', cycle: 'monthly' },
  { name: '塾代', category: '子ども・育児', cycle: 'monthly' },
  { name: '習い事', category: '子ども・育児', cycle: 'monthly' },
  { name: '給食費', category: '子ども・育児', cycle: 'monthly' },
  { name: 'NHK受信料', category: 'その他', cycle: 'monthly' },
]

export interface SubscriptionPreset {
  name: string
  amount: number
  yearlyAmount?: number
  cycle: 'monthly' | 'yearly'
  subcategory: string
  currency?: 'USD'
  usdAmount?: number
  usdYearlyAmount?: number
}

import subcategoriesJson from './data/subscription-subcategories.json'
import presetsJson from './data/subscription-presets.json'

export const SUBSCRIPTION_SUBCATEGORIES: { name: string; icon: string }[] = subcategoriesJson

export const SUBSCRIPTION_PRESETS: SubscriptionPreset[] = presetsJson as SubscriptionPreset[]

export const STORE_TYPES: CategoryInfo[] = [
  { name: 'スーパー', icon: '🛒', color: '#10b981' },
  { name: 'コンビニ', icon: '🏪', color: '#f97316' },
  { name: 'ドラッグストア', icon: '💊', color: '#06b6d4' },
  { name: 'デパート・百貨店', icon: '🏬', color: '#a855f7' },
  { name: 'ホームセンター', icon: '🔨', color: '#f59e0b' },
  { name: 'ガソリンスタンド', icon: '⛽', color: '#78716c' },
  { name: '飲食店', icon: '🍽️', color: '#ef4444' },
  { name: 'ネット通販', icon: '📦', color: '#3b82f6' },
  { name: '100円ショップ', icon: '💴', color: '#ec4899' },
  { name: '家電量販店', icon: '🖥️', color: '#6366f1' },
  { name: '自動販売機', icon: '🥤', color: '#0ea5e9' },
  { name: 'その他', icon: '🏷️', color: '#64748b' },
]

export const MEAL_TYPES: CategoryInfo[] = [
  { name: '朝食', icon: '🌅', color: '#f59e0b' },
  { name: '昼食', icon: '🍱', color: '#10b981' },
  { name: '夕食', icon: '🍚', color: '#f97316' },
  { name: '飲み物', icon: '🥤', color: '#06b6d4' },
  { name: 'その他', icon: '📦', color: '#64748b' },
]

export type PaymentType = 'cash' | 'credit_card' | 'emoney' | 'qr'

export const PAYMENT_TYPES: { type: PaymentType; name: string; icon: string }[] = [
  { type: 'cash', name: '現金', icon: '💵' },
  { type: 'credit_card', name: 'クレジットカード', icon: '💳' },
  { type: 'emoney', name: '電子マネー', icon: '🪙' },
  { type: 'qr', name: 'QRコード決済', icon: '📱' },
]

export interface DefaultConsumable {
  name: string
  category: string
  amount: number
  quantity: number
  cycle_days: number
  members_scale: boolean
}

export const DEFAULT_CONSUMABLES: DefaultConsumable[] = [
  // 日用品（衛生用品）
  { name: 'シャンプー', category: '日用品', amount: 500, quantity: 1, cycle_days: 60, members_scale: true },
  { name: 'コンディショナー', category: '日用品', amount: 500, quantity: 1, cycle_days: 60, members_scale: true },
  { name: 'ボディーソープ', category: '日用品', amount: 400, quantity: 1, cycle_days: 45, members_scale: true },
  { name: '歯磨き粉', category: '日用品', amount: 200, quantity: 1, cycle_days: 60, members_scale: true },
  { name: '歯ブラシ', category: '日用品', amount: 200, quantity: 1, cycle_days: 30, members_scale: true },
  // 衣服・美容
  { name: '洗顔料', category: '衣服・美容', amount: 800, quantity: 1, cycle_days: 60, members_scale: false },
  { name: '化粧水', category: '衣服・美容', amount: 2000, quantity: 1, cycle_days: 90, members_scale: false },
  { name: '乳液', category: '衣服・美容', amount: 1500, quantity: 1, cycle_days: 90, members_scale: false },
  { name: 'ファンデーション', category: '衣服・美容', amount: 3000, quantity: 1, cycle_days: 90, members_scale: false },
  { name: 'リップ・口紅', category: '衣服・美容', amount: 1500, quantity: 1, cycle_days: 180, members_scale: false },
  { name: 'マスカラ', category: '衣服・美容', amount: 1500, quantity: 1, cycle_days: 90, members_scale: false },
  { name: 'アイシャドウ', category: '衣服・美容', amount: 2000, quantity: 1, cycle_days: 180, members_scale: false },
  { name: 'BBクリーム', category: '衣服・美容', amount: 1500, quantity: 1, cycle_days: 90, members_scale: false },
  // 日用品（トイレ・洗剤）
  { name: 'トイレットペーパー', category: '日用品', amount: 800, quantity: 1, cycle_days: 30, members_scale: true },
  { name: 'ティッシュペーパー', category: '日用品', amount: 500, quantity: 1, cycle_days: 30, members_scale: true },
  { name: '洗濯洗剤', category: '日用品', amount: 1000, quantity: 1, cycle_days: 45, members_scale: true },
  { name: '柔軟剤', category: '日用品', amount: 700, quantity: 1, cycle_days: 45, members_scale: true },
  { name: '食器用洗剤', category: '日用品', amount: 300, quantity: 1, cycle_days: 60, members_scale: true },
  { name: 'トイレ用洗剤', category: '日用品', amount: 300, quantity: 1, cycle_days: 60, members_scale: false },
  { name: '漂白剤', category: '日用品', amount: 400, quantity: 1, cycle_days: 90, members_scale: false },
  // 医療費
  { name: 'マルチビタミン', category: '医療費', amount: 2000, quantity: 1, cycle_days: 60, members_scale: false },
  { name: '解熱鎮痛剤', category: '医療費', amount: 600, quantity: 1, cycle_days: 180, members_scale: false },
  { name: 'ばんそうこう', category: '医療費', amount: 300, quantity: 1, cycle_days: 365, members_scale: false },
  // 食費
  { name: '醤油', category: '食費', amount: 300, quantity: 1, cycle_days: 60, members_scale: false },
  { name: '料理酒', category: '食費', amount: 400, quantity: 1, cycle_days: 90, members_scale: false },
  { name: '砂糖', category: '食費', amount: 200, quantity: 1, cycle_days: 90, members_scale: false },
  { name: '塩', category: '食費', amount: 100, quantity: 1, cycle_days: 180, members_scale: false },
  { name: 'みりん', category: '食費', amount: 350, quantity: 1, cycle_days: 90, members_scale: false },
  { name: 'マヨネーズ', category: '食費', amount: 400, quantity: 1, cycle_days: 60, members_scale: false },
  { name: 'ケチャップ', category: '食費', amount: 300, quantity: 1, cycle_days: 60, members_scale: false },
  // その他
  { name: 'ゴミ袋', category: 'その他', amount: 500, quantity: 1, cycle_days: 30, members_scale: true },
  { name: 'キッチンペーパー', category: 'その他', amount: 300, quantity: 1, cycle_days: 30, members_scale: true },
  { name: 'ラップ', category: 'その他', amount: 200, quantity: 1, cycle_days: 60, members_scale: false },
  { name: 'アルミホイル', category: 'その他', amount: 200, quantity: 1, cycle_days: 90, members_scale: false },
  { name: 'スポンジ', category: 'その他', amount: 200, quantity: 1, cycle_days: 30, members_scale: false },
  { name: '乾電池', category: 'その他', amount: 500, quantity: 1, cycle_days: 180, members_scale: false },
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
  active: { label: '契約中', color: 'text-primary-600 bg-primary-50 dark:text-primary-400 dark:bg-primary-950/60' },
  reviewing: { label: '見直し中', color: 'text-warning-600 bg-warning-50 dark:text-warning-400 dark:bg-warning-950/60' },
  cancelled: { label: '解約済み', color: 'text-ink-muted bg-surface-hover' },
  unsubscribed: { label: '未契約', color: 'text-blue-500 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/60' },
} as const

export const HOUSEHOLD_MEMBERS_MIN = 1
export const HOUSEHOLD_MEMBERS_MAX = 10
export const MONTH_START_DAY_MIN = 1
export const MONTH_START_DAY_MAX = 28
export const CONSUMABLE_URGENT_THRESHOLD_DAYS = 7
export const SAVE_SUCCESS_DISPLAY_MS = 1500
export const WEEKS_PER_MONTH = 4.33
