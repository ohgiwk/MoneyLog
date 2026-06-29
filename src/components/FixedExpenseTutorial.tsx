import { useState } from 'react'
import {
  DEFAULT_FIXED_EXPENSES,
  SUBSCRIPTION_PRESETS,
  SUBSCRIPTION_SUBCATEGORIES,
} from '../constants'
import { fixedExpenseService } from '../lib/services/fixedExpenseService'
import type { FixedExpense } from '../lib/database.types'
import { getUsdJpyRate, setExpenseCurrencyMeta } from '../lib/exchangeRate'

const CATEGORY_META: Record<string, { icon: string; description: string }> = {
  住居費: { icon: '🏠', description: '家賃・管理費などを入力してください' },
  光熱費: { icon: '⚡', description: '電気・ガス・水道の月額を入力してください' },
  通信費: { icon: '📱', description: 'スマホ・インターネットの月額を入力してください' },
  保険: { icon: '🛡️', description: '生命保険・医療保険などを入力してください' },
  自動車: { icon: '🚗', description: '駐車場・自動車保険・ローンを入力してください' },
  その他固定費: { icon: '📦', description: 'その他の固定費を入力してください' },
}

// 住居費と光熱費は同一ステップでまとめて表示する
type StepKey = '住居費+光熱費' | '通信費' | '保険' | '自動車' | 'その他固定費' | 'subscription'

interface MultiItem {
  name: string
  amount: string
  cycle: 'monthly' | 'yearly'
  category: string
}

interface Step {
  key: StepKey
  icon: string
  title: string
  description: string
}

const STEPS: Step[] = [
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
    key: 'その他固定費',
    icon: '📦',
    title: 'その他固定費',
    description: 'その他の固定費を入力してください',
  },
  {
    key: 'subscription',
    icon: '🎬',
    title: 'サブスクリプション',
    description: '契約中のサービスを選んでください（複数選択可）',
  },
]

// StepKey に対応するカテゴリ一覧（住居費+光熱費 は2カテゴリ）
const STEP_CATEGORIES: Record<string, string[]> = {
  '住居費+光熱費': ['住居費', '光熱費'],
  通信費: ['通信費'],
  保険: ['保険'],
  自動車: ['自動車'],
  その他固定費: ['その他固定費'],
}

// ステップに対応するカテゴリ群から既存データを事前入力した MultiItem[] を作る
function buildItemsForStep(stepKey: StepKey, fixedExpenses: FixedExpense[]): MultiItem[] {
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
function buildSelectedSubs(fixedExpenses: FixedExpense[]): Set<string> {
  const names = fixedExpenses.filter((f) => f.category === 'サブスク').map((f) => f.name)
  return new Set(names)
}

interface MultiStepProps {
  items: MultiItem[]
  showCategoryHeaders: boolean
  onChange: (items: MultiItem[]) => void
}

function MultiStep({ items, showCategoryHeaders, onChange }: MultiStepProps) {
  // カテゴリごとにグループ化して表示
  const categories = showCategoryHeaders ? [...new Set(items.map((it) => it.category))] : null

  return (
    <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
      {categories
        ? categories.map((cat) => (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  {CATEGORY_META[cat]?.icon} {cat}
                </span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>
              {items
                .map((item, i) => ({ item, i }))
                .filter(({ item }) => item.category === cat)
                .map(({ item, i }) => (
                  <div key={i} className="flex items-center gap-3 mb-3">
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
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                        円
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          ))
        : items.map((item, i) => (
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
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  円
                </span>
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

function SubscriptionStep({
  selected,
  cycleOverrides,
  onToggle,
  onCycleChange,
}: SubscriptionStepProps) {
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
                <span
                  className={
                    'w-1.5 h-1.5 rounded-full ' +
                    (activeTab === sub.name ? 'bg-white' : 'bg-emerald-400')
                  }
                />
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
                  >
                    月
                  </button>
                  <button
                    type="button"
                    onClick={() => onCycleChange(p.name, 'yearly')}
                    className={
                      'px-2 py-1 transition border-l border-slate-200 ' +
                      (cycle === 'yearly' ? 'bg-slate-700 text-white' : 'bg-white text-slate-400')
                    }
                  >
                    年
                  </button>
                </div>
              )}
              <span className="text-xs text-slate-400 shrink-0 w-24 text-right">
                {p.currency === 'USD'
                  ? cycle === 'yearly'
                    ? `$${(p.usdYearlyAmount ?? p.usdAmount ?? 0).toLocaleString()}/年`
                    : `$${(p.usdAmount ?? 0).toLocaleString()}/月`
                  : cycle === 'yearly'
                    ? `${(p.yearlyAmount ?? p.amount).toLocaleString()}円/年`
                    : `${p.amount.toLocaleString()}円/月`}
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

// subscription 以外のステップキー一覧
const DATA_STEP_KEYS = STEPS.filter((s) => s.key !== 'subscription').map((s) => s.key)

export default function FixedExpenseTutorial({
  userId,
  fixedExpenses,
  onClose,
  onComplete,
}: Props) {
  const [stepIndex, setStepIndex] = useState(0)
  const [multiItems, setMultiItems] = useState<MultiItem[][]>(() =>
    DATA_STEP_KEYS.map((key) => buildItemsForStep(key as StepKey, fixedExpenses))
  )
  const [selectedSubs, setSelectedSubs] = useState<Set<string>>(() =>
    buildSelectedSubs(fixedExpenses)
  )
  const [cycleOverrides, setCycleOverrides] = useState<Map<string, 'monthly' | 'yearly'>>(new Map())
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

  // 現在のステップが data ステップなら対応インデックスを返す（subscription は -1）
  const dataStepIndex = DATA_STEP_KEYS.indexOf(step.key)

  function updateMultiItems(items: MultiItem[]) {
    setMultiItems((prev) => prev.map((it, i) => (i === dataStepIndex ? items : it)))
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

    // multi ステップの保存 — item.category を使うので正確なカテゴリで保存される
    multiItems.forEach((items) => {
      items.forEach((item) => {
        const amt = parseFloat(item.amount)
        if (isNaN(amt) || amt < 0) return
        const existing = fixedExpenses.find(
          (f) => f.name === item.name && f.category === item.category
        )
        const status: FixedExpense['status'] = amt === 0 ? 'unsubscribed' : 'active'
        if (existing) {
          updates.push({ id: existing.id, amount: amt, status })
        } else {
          inserts.push({
            user_id: userId,
            name: item.name,
            category: item.category,
            amount: amt,
            baseline_amount: amt,
            cycle: item.cycle,
            status,
            start_date: today,
            billing_day: null,
            notes: null,
          })
        }
      })
    })

    // サブスクの保存 — DB から最新の登録済み名称を取得してから重複を除外
    const existingSubs = await fixedExpenseService.fetchByUser(userId)
    const existingSubNames = new Set(
      existingSubs.filter((f) => f.category === 'サブスク').map((f) => f.name)
    )
    const usdRate = getUsdJpyRate()
    const usdSubsToInsert: typeof SUBSCRIPTION_PRESETS = []
    SUBSCRIPTION_PRESETS.filter(
      (p) => selectedSubs.has(p.name) && !existingSubNames.has(p.name)
    ).forEach((p) => {
      const cycle = cycleOverrides.get(p.name) ?? p.cycle
      if (p.currency === 'USD') {
        usdSubsToInsert.push(p)
        const usdAmt = cycle === 'yearly' ? (p.usdYearlyAmount ?? p.usdAmount ?? 0) : (p.usdAmount ?? 0)
        const jpyAmount = Math.round(usdAmt * usdRate)
        inserts.push({
          user_id: userId,
          name: p.name,
          category: 'サブスク',
          amount: jpyAmount,
          baseline_amount: jpyAmount,
          cycle,
          status: 'active',
          start_date: today,
          billing_day: null,
          notes: null,
        })
      } else {
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
          notes: null,
        })
      }
    })

    await Promise.all([
      fixedExpenseService.insertMany(inserts),
      ...updates.map(({ id, amount, status }) =>
        fixedExpenseService.update(id, { amount, status })
      ),
    ])

    // USD サブスクのメタデータを保存（insertMany後にIDを取得）
    if (usdSubsToInsert.length > 0) {
      const savedSubs = await fixedExpenseService.fetchByUser(userId)
      usdSubsToInsert.forEach((p) => {
        const cycle = cycleOverrides.get(p.name) ?? p.cycle
        const saved = savedSubs.find((f) => f.name === p.name && f.category === 'サブスク')
        if (saved) {
          const usdAmt = cycle === 'yearly' ? (p.usdYearlyAmount ?? p.usdAmount ?? 0) : (p.usdAmount ?? 0)
          setExpenseCurrencyMeta(saved.id, { currency: 'USD', usdAmount: usdAmt })
        }
      })
    }

    setSaving(false)
    onComplete()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-3xl px-5 pt-6 pb-8 mx-4">
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
        {step.key !== 'subscription' && dataStepIndex >= 0 && (
          <MultiStep
            items={multiItems[dataStepIndex]}
            showCategoryHeaders={step.key === '住居費+光熱費'}
            onChange={updateMultiItems}
          />
        )}
        {step.key === 'subscription' && (
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
