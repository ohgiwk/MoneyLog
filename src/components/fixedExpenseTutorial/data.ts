import { DEFAULT_FIXED_EXPENSES } from '../../constants'
import type { FixedExpense } from '../../lib/database.types'

export const CATEGORY_META: Record<string, { icon: string; description: string }> = {
  住居費: { icon: '🏠', description: '家賃・管理費などを入力してください' },
  光熱費: { icon: '⚡', description: '電気・ガス・水道の月額を入力してください' },
  通信費: { icon: '📱', description: 'スマホ・インターネットの月額を入力してください' },
  保険: { icon: '🛡️', description: '生命保険・医療保険などを入力してください' },
  自動車: { icon: '🚗', description: '駐車場・自動車保険・ローンを入力してください' },
  その他: { icon: '📦', description: 'その他の固定費を入力してください' },
}

// 住居費と光熱費は同一ステップでまとめて表示する
export type StepKey =
  | 'intro'
  | '住居費+光熱費'
  | '通信費'
  | '保険'
  | '自動車'
  | '子ども・育児'
  | 'subscription'
  | 'その他'
  | 'review'
  | 'thanks'
  | 'guide'

export interface MultiItem {
  name: string
  amount: string
  cycle: 'monthly' | 'yearly'
  category: string
}

export interface Step {
  key: StepKey
  icon: string
  title: string
  description: string
}

export const STEPS: Step[] = [
  {
    key: 'intro',
    icon: '📋',
    title: '固定費の記録を始めよう',
    description: 'まずは基本的な固定費を登録してみましょう',
  },
  {
    key: '住居費+光熱費',
    icon: '🏠',
    title: '住居費・光熱費',
    description: '家賃・電気・ガス・水道の月額を入力してください',
  },
  {
    key: '通信費',
    icon: '📱',
    title: '通信費',
    description: 'スマホ・インターネットの月額を入力してください',
  },
  {
    key: '保険',
    icon: '🛡️',
    title: '保険',
    description: '生命保険・医療保険などを入力してください',
  },
  {
    key: '自動車',
    icon: '🚗',
    title: '自動車',
    description: '駐車場・自動車保険・ローンを入力してください',
  },
  {
    key: '子ども・育児',
    icon: '👶',
    title: '子ども・育児',
    description: '保育園・学校・習い事などの費用を入力してください',
  },
  {
    key: 'subscription',
    icon: '🎬',
    title: 'サブスクリプション',
    description: '契約中のサービスを選んでください（複数選択可）',
  },
  {
    key: 'その他',
    icon: '📦',
    title: 'その他',
    description: '名前・カテゴリ・金額を自由に入力してください',
  },
  {
    key: 'review',
    icon: '🔍',
    title: '見直したい項目',
    description: '削減・解約を検討したい項目にチェックを入れてください',
  },
  {
    key: 'thanks',
    icon: '🎉',
    title: '入力お疲れ様でした！',
    description: '基本的な固定費の登録が完了しました',
  },
  {
    key: 'guide',
    icon: '🧭',
    title: '固定費画面の使い方',
    description: 'これだけ覚えれば大丈夫です',
  },
]

// 「固定費画面の使い方」ガイドで案内する項目
export const GUIDE_ITEMS: { icon: string; title: string; description: string }[] = [
  {
    icon: '📊',
    title: '固定費合計をひと目で確認',
    description: '画面上部のカードで、毎月の固定費合計がすぐにわかります。',
  },
  {
    icon: '🗂️',
    title: 'タブで絞り込み',
    description: '「契約中」「解約済み」「見直し中」でタブを切り替えて確認できます。',
  },
  {
    icon: '👆',
    title: 'タップして編集',
    description: '項目をタップすると、金額の変更や解約の記録ができます。',
  },
  {
    icon: '➕',
    title: '新しい固定費を追加',
    description: '右下の＋ボタンから、いつでも新しい固定費を追加できます。',
  },
]

// StepKey に対応するカテゴリ一覧（住居費+光熱費 は2カテゴリ）
const STEP_CATEGORIES: Record<string, string[]> = {
  '住居費+光熱費': ['住居費', '光熱費'],
  通信費: ['通信費'],
  保険: ['保険'],
  自動車: ['自動車'],
  '子ども・育児': ['子ども・育児'],
}

// データ入力ステップのキー一覧（データ入力以外の案内ステップを除く）
const NON_DATA_STEP_KEYS: StepKey[] = [
  'intro',
  'subscription',
  'その他',
  'review',
  'thanks',
  'guide',
]
export const DATA_STEP_KEYS = STEPS.filter((s) => !NON_DATA_STEP_KEYS.includes(s.key)).map(
  (s) => s.key
)

// ステップに対応するカテゴリ群から既存データを事前入力した MultiItem[] を作る
export function buildItemsForStep(stepKey: StepKey, fixedExpenses: FixedExpense[]): MultiItem[] {
  const categories = STEP_CATEGORIES[stepKey] ?? []
  return categories.flatMap((cat) =>
    DEFAULT_FIXED_EXPENSES.filter((d) => d.category === cat).map((d) => {
      const existing = fixedExpenses.find((f) => f.name === d.name && f.category === d.category)
      return {
        name: d.name,
        category: cat,
        cycle: d.cycle,
        amount: existing?.amount != null ? existing.amount.toString() : '',
      }
    })
  )
}

// 既存サブスク（カテゴリ=サブスク）の名前セットを作る
export function buildSelectedSubs(fixedExpenses: FixedExpense[]): Set<string> {
  const names = fixedExpenses.filter((f) => f.category === 'サブスク').map((f) => f.name)
  return new Set(names)
}
