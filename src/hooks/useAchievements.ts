import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export interface Achievement {
  id: string
  category: '固定費' | '出費記録' | '買い物メモ'
  title: string
  description: string
  achieved: boolean
  achievedAt?: string
}

interface AchievementState {
  [id: string]: { achieved: boolean; achievedAt?: string }
}

function storageKey(userId: string) {
  return `achievements_v1_${userId}`
}

function loadState(userId: string): AchievementState {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveState(userId: string, state: AchievementState) {
  localStorage.setItem(storageKey(userId), JSON.stringify(state))
}

// 連続記録日数（最長ストリーク）を計算
function longestStreak(dates: string[]): number {
  if (dates.length === 0) return 0
  const sorted = [...new Set(dates)].sort()
  let best = 1
  let current = 1
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1])
    const curr = new Date(sorted[i])
    const diff = (curr.getTime() - prev.getTime()) / 86400000
    if (diff === 1) {
      current++
      if (current > best) best = current
    } else {
      current = 1
    }
  }
  return best
}

const ACHIEVEMENT_DEFS: Omit<Achievement, 'achieved' | 'achievedAt'>[] = [
  // 固定費 - 登録
  {
    id: 'fixed_1',
    category: '固定費',
    title: '固定費デビュー',
    description: '固定費を初めて登録する',
  },
  {
    id: 'fixed_3',
    category: '固定費',
    title: '固定費マスター見習い',
    description: '固定費を3件登録する',
  },
  {
    id: 'fixed_10',
    category: '固定費',
    title: '固定費マスター',
    description: '固定費を10件登録する',
  },
  // 固定費 - 解約
  {
    id: 'unsub_1',
    category: '固定費',
    title: '節約の第一歩',
    description: '固定費を初めて解約する',
  },
  { id: 'unsub_3', category: '固定費', title: '解約の達人', description: '固定費を3件解約する' },
  {
    id: 'unsub_10',
    category: '固定費',
    title: '固定費スリム化',
    description: '固定費を10件解約する',
  },
  // 出費記録 - 件数
  {
    id: 'expense_1',
    category: '出費記録',
    title: '記録スタート',
    description: '出費を初めて記録する',
  },
  {
    id: 'expense_10',
    category: '出費記録',
    title: '記録の習慣',
    description: '出費を10回記録する',
  },
  {
    id: 'expense_50',
    category: '出費記録',
    title: '記録の達人',
    description: '出費を50回記録する',
  },
  {
    id: 'expense_100',
    category: '出費記録',
    title: '記録マスター',
    description: '出費を100回記録する',
  },
  {
    id: 'expense_200',
    category: '出費記録',
    title: '記録の鬼',
    description: '出費を200回記録する',
  },
  // 出費記録 - 継続
  {
    id: 'streak_7',
    category: '出費記録',
    title: '1週間継続',
    description: '7日連続で出費を記録する',
  },
  {
    id: 'streak_30',
    category: '出費記録',
    title: '1ヶ月継続',
    description: '30日連続で出費を記録する',
  },
  {
    id: 'streak_90',
    category: '出費記録',
    title: '3ヶ月継続',
    description: '90日連続で出費を記録する',
  },
  {
    id: 'streak_180',
    category: '出費記録',
    title: '6ヶ月継続',
    description: '180日連続で出費を記録する',
  },
  {
    id: 'streak_365',
    category: '出費記録',
    title: '1年継続',
    description: '365日連続で出費を記録する',
  },
  // 買い物メモ - 作成
  {
    id: 'shopping_add_1',
    category: '買い物メモ',
    title: '買い物メモスタート',
    description: '初めてアイテムを買い物メモに追加する',
  },
  {
    id: 'shopping_add_10',
    category: '買い物メモ',
    title: 'メモ活用中',
    description: '買い物メモに10品追加する',
  },
  {
    id: 'shopping_add_50',
    category: '買い物メモ',
    title: 'メモ達人',
    description: '買い物メモに50品追加する',
  },
  // 買い物メモ - 購入
  {
    id: 'shopping_buy_1',
    category: '買い物メモ',
    title: '初めての購入記録',
    description: '買い物メモから初めて購入済みにする',
  },
  {
    id: 'shopping_buy_10',
    category: '買い物メモ',
    title: '買い物上手',
    description: '買い物メモから10品を購入済みにする',
  },
  {
    id: 'shopping_buy_50',
    category: '買い物メモ',
    title: '買い物達人',
    description: '買い物メモから50品を購入済みにする',
  },
  {
    id: 'shopping_plan',
    category: '買い物メモ',
    title: '計画的な買い物',
    description: '予算を設定したアイテムを購入する',
  },
]

export function useAchievements(userId: string) {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    let cancelled = false

    async function evaluate() {
      const [fixedRes, unsubRes, txRes, shoppingAllRes, shoppingBoughtRes, shoppingPlanRes] =
        await Promise.all([
          supabase.from('fixed_expenses').select('id', { count: 'exact' }).eq('user_id', userId),
          supabase
            .from('fixed_expenses')
            .select('id', { count: 'exact' })
            .eq('user_id', userId)
            .in('status', ['unsubscribed', 'cancelled']),
          supabase.from('transactions').select('date').eq('user_id', userId).eq('type', 'expense'),
          supabase.from('shopping_items').select('id', { count: 'exact' }).eq('user_id', userId),
          supabase
            .from('shopping_items')
            .select('id', { count: 'exact' })
            .eq('user_id', userId)
            .eq('status', 'bought'),
          supabase
            .from('shopping_items')
            .select('id', { count: 'exact' })
            .eq('user_id', userId)
            .eq('status', 'bought')
            .gt('budget_amount', 0),
        ])

      if (cancelled) return

      const fixedCount = fixedRes.count ?? 0
      const unsubCount = unsubRes.count ?? 0
      const shoppingAllCount = shoppingAllRes.count ?? 0
      const shoppingBoughtCount = shoppingBoughtRes.count ?? 0
      const shoppingPlanCount = shoppingPlanRes.count ?? 0
      const txDates: string[] = (txRes.data ?? []).map((r) => r.date)
      const txCount = txDates.length
      const streak = longestStreak(txDates)

      const now = new Date().toISOString()
      const prev = loadState(userId)
      const next: AchievementState = { ...prev }

      function check(id: string, condition: boolean) {
        if (condition && !next[id]?.achieved) {
          next[id] = { achieved: true, achievedAt: now }
        }
      }

      check('fixed_1', fixedCount >= 1)
      check('fixed_3', fixedCount >= 3)
      check('fixed_10', fixedCount >= 10)
      check('unsub_1', unsubCount >= 1)
      check('unsub_3', unsubCount >= 3)
      check('unsub_10', unsubCount >= 10)
      check('expense_1', txCount >= 1)
      check('expense_10', txCount >= 10)
      check('expense_50', txCount >= 50)
      check('expense_100', txCount >= 100)
      check('expense_200', txCount >= 200)
      check('streak_7', streak >= 7)
      check('streak_30', streak >= 30)
      check('streak_90', streak >= 90)
      check('streak_180', streak >= 180)
      check('streak_365', streak >= 365)
      check('shopping_add_1', shoppingAllCount >= 1)
      check('shopping_add_10', shoppingAllCount >= 10)
      check('shopping_add_50', shoppingAllCount >= 50)
      check('shopping_buy_1', shoppingBoughtCount >= 1)
      check('shopping_buy_10', shoppingBoughtCount >= 10)
      check('shopping_buy_50', shoppingBoughtCount >= 50)
      check('shopping_plan', shoppingPlanCount >= 1)

      saveState(userId, next)

      const result: Achievement[] = ACHIEVEMENT_DEFS.map((def) => ({
        ...def,
        achieved: next[def.id]?.achieved ?? false,
        achievedAt: next[def.id]?.achievedAt,
      }))

      setAchievements(result)
      setLoading(false)
    }

    evaluate()
    return () => {
      cancelled = true
    }
  }, [userId])

  return { achievements, loading }
}
