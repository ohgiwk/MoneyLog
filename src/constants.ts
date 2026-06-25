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
  { name: 'NHK受信料', category: 'その他固定費', cycle: 'monthly' },
]

export interface SubscriptionPreset {
  name: string
  amount: number
  cycle: 'monthly' | 'yearly'
}

export const SUBSCRIPTION_PRESETS: SubscriptionPreset[] = [
  { name: 'Netflix (スタンダード)', amount: 1590, cycle: 'monthly' },
  { name: 'Netflix (プレミアム)', amount: 1980, cycle: 'monthly' },
  { name: 'Amazon Prime', amount: 600, cycle: 'monthly' },
  { name: 'Disney+', amount: 990, cycle: 'monthly' },
  { name: 'Hulu', amount: 1026, cycle: 'monthly' },
  { name: 'Apple TV+', amount: 900, cycle: 'monthly' },
  { name: 'U-NEXT', amount: 2189, cycle: 'monthly' },
  { name: 'Apple Music', amount: 1080, cycle: 'monthly' },
  { name: 'Spotify プレミアム', amount: 980, cycle: 'monthly' },
  { name: 'YouTube Premium', amount: 1280, cycle: 'monthly' },
  { name: 'Amazon Music Unlimited', amount: 980, cycle: 'monthly' },
  { name: 'iCloud+ 50GB', amount: 130, cycle: 'monthly' },
  { name: 'iCloud+ 200GB', amount: 400, cycle: 'monthly' },
  { name: 'iCloud+ 2TB', amount: 1300, cycle: 'monthly' },
  { name: 'Google One 100GB', amount: 250, cycle: 'monthly' },
  { name: 'Google One 200GB', amount: 380, cycle: 'monthly' },
  { name: 'Microsoft 365 Personal', amount: 1490, cycle: 'monthly' },
  { name: 'Adobe Creative Cloud', amount: 6480, cycle: 'monthly' },
  { name: 'ChatGPT Plus', amount: 3000, cycle: 'monthly' },
  { name: 'Claude Pro', amount: 3000, cycle: 'monthly' },
  { name: 'NHKプラス', amount: 1100, cycle: 'monthly' },
  { name: 'Nintendo Switch Online', amount: 306, cycle: 'monthly' },
  { name: 'Xbox Game Pass', amount: 850, cycle: 'monthly' },
]

export const STATUS_LABELS = {
  active: { label: '契約中', color: 'text-emerald-600 bg-emerald-50' },
  reviewing: { label: '見直し中', color: 'text-amber-600 bg-amber-50' },
  cancelled: { label: '解約済み', color: 'text-slate-400 bg-slate-100' },
  unsubscribed: { label: '未契約', color: 'text-blue-500 bg-blue-50' },
} as const
