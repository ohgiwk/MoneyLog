import { useState } from 'react'
import { DEFAULT_FIXED_EXPENSES, SUBSCRIPTION_PRESETS, SUBSCRIPTION_SUBCATEGORIES } from '../constants'
import { fixedExpenseService } from '../lib/services/fixedExpenseService'
import type { FixedExpense } from '../lib/database.types'

// DEFAULT_FIXED_EXPENSES をカテゴリ順にグループ化してステップを作る
const CATEGORY_ORDER = ['住居費', '光熱費', '通信費', '保険', 'その他固定費']

const CATEGORY_META: Record<string, { icon: string; description: string }> = {
  住居費: { icon: '🏠', description: '家賃・管理費などを入力してください' },
  光熱費: { icon: '⚡', description: '電気・ガス・水道の月額を入力してください' },
  通信費: { icon: '📱', description: 'スマホ・インターネットの月額を入力してください' },
  保険: { icon: '🛡️', description: '生命保険・医療保険などを入力してください' },
  その他固定費: { icon: '📦', description: 'その他の固定費を入力してください' },
}

type StepCategory = (typeof CATEGORY_ORDER)[number] | 'subscription'

interface MultiItem {
  name: string
  amount: string
  cycle: 'monthly' | 'yearly'
}

interface Step {
  category: StepCategory
  icon: string
  title: string
  description: string
}

const STEPS: Step[] = [
  ...CATEGORY_ORDER.map((cat) => ({
    category: cat as StepCategory,
    icon: CATEGORY_META[cat].icon,
    title: cat,
    description: CATEGORY_META[cat].description,
  })),
  {
    category: 'subscription' as StepCategory,
    icon: '🎬',
    title: 'サブスクリプション',
    description: '契約中のサービスを選んでください（複数選択可）',
  },
]

// 既存 fixedExpenses から項目を事前入力した MultiItem[] を作る
function buildItems(category: string, fixedExpenses: FixedExpense[]): MultiItem[] {
  const defaults = DEFAULT_FIXED_EXPENSES.filter((d) => d.category === category)
  return defaults.map((d) => {
    const existing = fixedExpenses.find((f) => f.name === d.name && f.category === d.category)
    return {
      name: d.name,
      cycle: d.cycle,
      amount: existing?.amount != null ? existing.amount.toString() : '',
    }
  })
}

// 既存サブスク（カテゴリ=サブスク）の名前セットを作る
function buildSelectedSubs(fixedExpenses: FixedExpense[]): Set<string> {
  const names = fixedExpenses
    .filter((f) => f.category === 'サブスク')
    .map((f) => f.name)
  return new Set(names)
}

interface MultiStepProps {
  items: MultiItem[]
  onChange: (items: MultiItem[]) => void
}

function MultiStep({ items, onChange }: MultiStepProps) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-sm text-slate-600 w-28 shrink-0">{item.name}</span>
          <div className="flex-1 relative">
            <input
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={item.amount}
              onChange={(e) => {
                const next = [...items]
                next[i] = { ...item, amount: e.target.value }
                onChange(next)
              }}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">円</span>
          </div>
        </div>
      ))}
    </div>
  )
}

interface SubscriptionStepProps {
  selected: Set<string>
  cycleOverrides: Map<string, 'monthly' | 'yearly'>
  onToggle: (name: string) => void
  onCycleChange: (name: string, cycle: 'monthly' | 'yearly') => void
}

function SubscriptionStep({ selected, cycleOverrides, onToggle, onCycleChange }: SubscriptionStepProps) {
  const [activeTab, setActiveTab] = useState(SUBSCRIPTION_SUBCATEGORIES[0].name)

  const presets = SUBSCRIPTION_PRESETS.filter((p) => p.subcategory === activeTab)

  return (
    <div>
      {/* タブ */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-3 scrollbar-none">
        {SUBSCRIPTION_SUBCATEGORIES.map((sub) => {
          const hasSelected = SUBSCRIPTION_PRESETS.some(
            (p) => p.subcategory === sub.name && selected.has(p.name)
          )
          return (
            <button
              key={sub.name}
              type="button"
              onClick={() => setActiveTab(sub.name)}
              className={
                'flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition ' +
                (activeTab === sub.name
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-100 text-slate-500')
              }
            >
              <span>{sub.icon}</span>
              <span>{sub.name}</span>
              {hasSelected && (
                <span className={
                  'w-1.5 h-1.5 rounded-full ' +
                  (activeTab === sub.name ? 'bg-white' : 'bg-emerald-400')
                } />
              )}
            </button>
          )
        })}
      </div>
      {/* サービス一覧 */}
      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
        {presets.map((p) => {
          const checked = selected.has(p.name)
          const cycle = cycleOverrides.get(p.name) ?? p.cycle
          return (
            <div
              key={p.name}
              className={
                'flex items-center gap-2 px-3 py-2.5 rounded-xl border transition ' +
                (checked ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white')
              }
            >
              <button
                type="button"
                onClick={() => onToggle(p.name)}
                className="flex items-center gap-2 flex-1 min-w-0 text-left"
              >
                <span
                  className={
                    'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ' +
                    (checked ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300')
                  }
                >
                  {checked && <span className="text-white text-xs font-bold">✓</span>}
                </span>
                <span className="flex-1 text-sm text-slate-700 truncate">{p.name}</span>
              </button>
              {/* 月/年トグル（年額プランがある場合のみ表示） */}
              {(p.yearlyAmount != null || p.cycle === 'yearly') && (
                <div className="flex rounded-lg overflow-hidden border border-slate-200 shrink-0 text-xs">
                  <button
                    type="button"
                    onClick={() => onCycleChange(p.name, 'monthly')}
                    className={
                      'px-2 py-1 transition ' +
                      (cycle === 'monthly' ? 'bg-slate-700 text-white' : 'bg-white text-slate-400')
                    }
                  >月</button>
                  <button
                    type="button"
                    onClick={() => onCycleChange(p.name, 'yearly')}
                    className={
                      'px-2 py-1 transition border-l border-slate-200 ' +
                      (cycle === 'yearly' ? 'bg-slate-700 text-white' : 'bg-white text-slate-400')
                    }
                  >年</button>
                </div>
              )}
              <span className="text-xs text-slate-400 shrink-0 w-20 text-right">
                {cycle === 'yearly'
                  ? (p.yearlyAmount ?? p.amount).toLocaleString()
                  : p.amount.toLocaleString()
                }円/{cycle === 'monthly' ? '月' : '年'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface Props {
  userId: string
  fixedExpenses: FixedExpense[]
  onClose: () => void
  onComplete: () => void
}

export default function FixedExpenseTutorial({ userId, fixedExpenses, onClose, onComplete }: Props) {
  const [stepIndex, setStepIndex] = useState(0)
  const [multiItems, setMultiItems] = useState<MultiItem[][]>(() =>
    CATEGORY_ORDER.map((cat) => buildItems(cat, fixedExpenses))
  )
  const [selectedSubs, setSelectedSubs] = useState<Set<string>>(() =>
    buildSelectedSubs(fixedExpenses)
  )
  const [cycleOverrides, setCycleOverrides] = useState<Map<string, 'monthly' | 'yearly'>>(new Map)
  const [saving, setSaving] = useState(false)

  function toggleSub(name: string) {
    setSelectedSubs((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  function setCycleOverride(name: string, cycle: 'monthly' | 'yearly') {
    setCycleOverrides((prev) => new Map(prev).set(name, cycle))
  }

  const step = STEPS[stepIndex]
  const isLast = stepIndex === STEPS.length - 1
  const today = new Date().toISOString().slice(0, 10)

  function updateMultiItems(items: MultiItem[]) {
    setMultiItems((prev) => prev.map((it, i) => (i === stepIndex ? items : it)))
  }

  async function handleNext() {
    if (!isLast) {
      setStepIndex((i) => i + 1)
      return
    }

    setSaving(true)
    type InsertRow = Parameters<typeof fixedExpenseService.insertMany>[0][number]
    const inserts: InsertRow[] = []
    const updates: { id: string; amount: number; status: FixedExpense['status'] }[] = []

    // multi ステップの保存（save時に最新の fixedExpenses で既存チェック）
    CATEGORY_ORDER.forEach((cat, i) => {
      multiItems[i].forEach((item) => {
        const amt = parseFloat(item.amount)
        if (isNaN(amt) || amt < 0) return
        const existing = fixedExpenses.find((f) => f.name === item.name && f.category === cat)
        const status: FixedExpense['status'] = amt === 0 ? 'unsubscribed' : 'active'
        if (existing) {
          updates.push({ id: existing.id, amount: amt, status })
        } else {
          inserts.push({
            user_id: userId,
            name: item.name,
            category: cat,
            amount: amt,
            baseline_amount: amt,
            cycle: item.cycle,
            status,
            start_date: today,
            billing_day: null,
          })
        }
      })
    })

    // サブスクの保存 — DB から最新の登録済み名称を取得してから重複を除外
    const existingSubs = await fixedExpenseService.fetchByUser(userId)
    const existingSubNames = new Set(
      existingSubs.filter((f) => f.category === 'サブスク').map((f) => f.name),
    )
    SUBSCRIPTION_PRESETS.filter(
      (p) => selectedSubs.has(p.name) && !existingSubNames.has(p.name),
    ).forEach((p) => {
      const cycle = cycleOverrides.get(p.name) ?? p.cycle
      const amount = cycle === 'yearly' ? (p.yearlyAmount ?? p.amount) : p.amount
      inserts.push({
        user_id: userId,
        name: p.name,
        category: 'サブスク',
        amount,
        baseline_amount: amount,
        cycle,
        status: 'active',
        start_date: today,
        billing_day: null,
      })
    })

    await Promise.all([
      fixedExpenseService.insertMany(inserts),
      ...updates.map(({ id, amount, status }) =>
        fixedExpenseService.update(id, { amount, status }),
      ),
    ])

    setSaving(false)
    onComplete()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-t-3xl px-5 pt-6 pb-8">
        {/* プログレス */}
        <div className="flex gap-1.5 mb-5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={
                'h-1 flex-1 rounded-full transition-colors ' +
                (i <= stepIndex ? 'bg-emerald-500' : 'bg-slate-200')
              }
            />
          ))}
        </div>

        {/* ヘッダー */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{step.icon}</span>
          <div>
            <div className="font-bold text-slate-800">{step.title}</div>
            <div className="text-xs text-slate-400">{step.description}</div>
          </div>
        </div>

        {/* コンテンツ */}
        {step.category !== 'subscription' && (
          <MultiStep
            items={multiItems[CATEGORY_ORDER.indexOf(step.category as string)]}
            onChange={updateMultiItems}
          />
        )}
        {step.category === 'subscription' && (
          <SubscriptionStep
            selected={selectedSubs}
            cycleOverrides={cycleOverrides}
            onToggle={toggleSub}
            onCycleChange={setCycleOverride}
          />
        )}

        {/* ボタン */}
        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-slate-400 text-sm active:bg-slate-100"
          >
            閉じる
          </button>
          {stepIndex > 0 && (
            <button
              onClick={() => setStepIndex((i) => i - 1)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm active:bg-slate-50"
            >
              ← 戻る
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold active:bg-emerald-600 disabled:opacity-50"
          >
            {saving ? '保存中...' : isLast ? '完了' : '次へ →'}
          </button>
        </div>
      </div>
    </div>
  )
}
