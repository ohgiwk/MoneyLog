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
  subcategory: string
}

export const SUBSCRIPTION_SUBCATEGORIES: { name: string; icon: string }[] = [
  { name: '動画', icon: '🎬' },
  { name: '音楽', icon: '🎵' },
  { name: 'AI', icon: '🤖' },
  { name: 'ゲーム', icon: '🎮' },
  { name: 'ストレージ', icon: '☁️' },
  { name: 'ビジネス', icon: '💼' },
  { name: 'ニュース', icon: '📰' },
  { name: 'その他', icon: '📦' },
]

export const SUBSCRIPTION_PRESETS: SubscriptionPreset[] = [
  // 動画
  { name: 'Netflix (スタンダード)', amount: 1590, cycle: 'monthly', subcategory: '動画' },
  { name: 'Netflix (プレミアム)', amount: 1980, cycle: 'monthly', subcategory: '動画' },
  { name: 'Amazon Prime', amount: 600, cycle: 'monthly', subcategory: '動画' },
  { name: 'Disney+', amount: 990, cycle: 'monthly', subcategory: '動画' },
  { name: 'Hulu', amount: 1026, cycle: 'monthly', subcategory: '動画' },
  { name: 'Apple TV+', amount: 900, cycle: 'monthly', subcategory: '動画' },
  { name: 'U-NEXT', amount: 2189, cycle: 'monthly', subcategory: '動画' },
  { name: 'DAZN', amount: 4200, cycle: 'monthly', subcategory: '動画' },
  { name: 'NHKプラス', amount: 1100, cycle: 'monthly', subcategory: '動画' },
  { name: 'Paravi', amount: 1017, cycle: 'monthly', subcategory: '動画' },
  { name: 'FOD プレミアム', amount: 976, cycle: 'monthly', subcategory: '動画' },
  { name: 'TVer プレミアム', amount: 550, cycle: 'monthly', subcategory: '動画' },
  // 音楽
  { name: 'Apple Music', amount: 1080, cycle: 'monthly', subcategory: '音楽' },
  { name: 'Spotify プレミアム', amount: 980, cycle: 'monthly', subcategory: '音楽' },
  { name: 'YouTube Premium', amount: 1280, cycle: 'monthly', subcategory: '音楽' },
  { name: 'Amazon Music Unlimited', amount: 980, cycle: 'monthly', subcategory: '音楽' },
  { name: 'LINE MUSIC', amount: 980, cycle: 'monthly', subcategory: '音楽' },
  { name: 'AWA', amount: 960, cycle: 'monthly', subcategory: '音楽' },
  { name: 'mora qualitas', amount: 1980, cycle: 'monthly', subcategory: '音楽' },
  // AI
  { name: 'ChatGPT Plus', amount: 3000, cycle: 'monthly', subcategory: 'AI' },
  { name: 'ChatGPT Pro', amount: 30000, cycle: 'monthly', subcategory: 'AI' },
  { name: 'Claude Pro', amount: 3000, cycle: 'monthly', subcategory: 'AI' },
  { name: 'Claude Max (5x)', amount: 9000, cycle: 'monthly', subcategory: 'AI' },
  { name: 'Gemini Advanced', amount: 2900, cycle: 'monthly', subcategory: 'AI' },
  { name: 'Copilot Pro', amount: 3200, cycle: 'monthly', subcategory: 'AI' },
  { name: 'Perplexity Pro', amount: 2500, cycle: 'monthly', subcategory: 'AI' },
  { name: 'Notion AI', amount: 1000, cycle: 'monthly', subcategory: 'AI' },
  // ゲーム
  { name: 'Nintendo Switch Online', amount: 306, cycle: 'monthly', subcategory: 'ゲーム' },
  { name: 'Nintendo Switch Online+', amount: 500, cycle: 'monthly', subcategory: 'ゲーム' },
  { name: 'Xbox Game Pass', amount: 850, cycle: 'monthly', subcategory: 'ゲーム' },
  { name: 'PlayStation Plus エッセンシャル', amount: 850, cycle: 'monthly', subcategory: 'ゲーム' },
  { name: 'PlayStation Plus エクストラ', amount: 1300, cycle: 'monthly', subcategory: 'ゲーム' },
  { name: 'PlayStation Plus プレミアム', amount: 1550, cycle: 'monthly', subcategory: 'ゲーム' },
  { name: 'Apple Arcade', amount: 600, cycle: 'monthly', subcategory: 'ゲーム' },
  { name: 'Google Play Pass', amount: 610, cycle: 'monthly', subcategory: 'ゲーム' },
  // ストレージ
  { name: 'iCloud+ 50GB', amount: 130, cycle: 'monthly', subcategory: 'ストレージ' },
  { name: 'iCloud+ 200GB', amount: 400, cycle: 'monthly', subcategory: 'ストレージ' },
  { name: 'iCloud+ 2TB', amount: 1300, cycle: 'monthly', subcategory: 'ストレージ' },
  { name: 'Google One 100GB', amount: 250, cycle: 'monthly', subcategory: 'ストレージ' },
  { name: 'Google One 200GB', amount: 380, cycle: 'monthly', subcategory: 'ストレージ' },
  { name: 'Google One 2TB', amount: 1300, cycle: 'monthly', subcategory: 'ストレージ' },
  { name: 'Dropbox Plus', amount: 1500, cycle: 'monthly', subcategory: 'ストレージ' },
  { name: 'OneDrive 100GB', amount: 260, cycle: 'monthly', subcategory: 'ストレージ' },
  // ビジネス
  { name: 'Microsoft 365 Personal', amount: 1490, cycle: 'monthly', subcategory: 'ビジネス' },
  { name: 'Adobe Creative Cloud', amount: 6480, cycle: 'monthly', subcategory: 'ビジネス' },
  { name: 'Adobe Acrobat', amount: 1380, cycle: 'monthly', subcategory: 'ビジネス' },
  { name: 'Notion Plus', amount: 1600, cycle: 'monthly', subcategory: 'ビジネス' },
  { name: 'Slack Pro', amount: 925, cycle: 'monthly', subcategory: 'ビジネス' },
  { name: 'Zoom Pro', amount: 2125, cycle: 'monthly', subcategory: 'ビジネス' },
  { name: 'Canva Pro', amount: 1500, cycle: 'monthly', subcategory: 'ビジネス' },
  { name: 'GitHub Copilot', amount: 1280, cycle: 'monthly', subcategory: 'ビジネス' },
  // ニュース
  { name: '日経電子版', amount: 4277, cycle: 'monthly', subcategory: 'ニュース' },
  { name: '朝日新聞デジタル', amount: 1980, cycle: 'monthly', subcategory: 'ニュース' },
  { name: '読売新聞オンライン', amount: 2100, cycle: 'monthly', subcategory: 'ニュース' },
  { name: 'NewsPicks', amount: 1700, cycle: 'monthly', subcategory: 'ニュース' },
  { name: 'Kindle Unlimited', amount: 980, cycle: 'monthly', subcategory: 'ニュース' },
  { name: 'dマガジン', amount: 580, cycle: 'monthly', subcategory: 'ニュース' },
  // その他
  { name: 'NHK受信料', amount: 1100, cycle: 'monthly', subcategory: 'その他' },
  { name: 'Amazon Prime (年払い)', amount: 600, cycle: 'yearly', subcategory: 'その他' },
  { name: 'Duolingo Plus', amount: 1067, cycle: 'monthly', subcategory: 'その他' },
  { name: 'Headspace', amount: 1300, cycle: 'monthly', subcategory: 'その他' },
  { name: 'マネーフォワード ME プレミアム', amount: 500, cycle: 'monthly', subcategory: 'その他' },
]

export const STATUS_LABELS = {
  active: { label: '契約中', color: 'text-emerald-600 bg-emerald-50' },
  reviewing: { label: '見直し中', color: 'text-amber-600 bg-amber-50' },
  cancelled: { label: '解約済み', color: 'text-slate-400 bg-slate-100' },
  unsubscribed: { label: '未契約', color: 'text-blue-500 bg-blue-50' },
} as const
