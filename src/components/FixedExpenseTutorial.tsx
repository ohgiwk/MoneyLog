import { useState, useMemo, useEffect } from 'react'
import {
  DEFAULT_FIXED_EXPENSES,
  FIXED_EXPENSE_CATEGORIES,
  SUBSCRIPTION_PRESETS,
  SUBSCRIPTION_SUBCATEGORIES,
} from '../constants'
import { fixedExpenseService } from '../lib/services/fixedExpenseService'
import { wishlistService } from '../lib/services/wishlistService'
import type { FixedExpense } from '../lib/database.types'
import { getUsdJpyRate, setExpenseCurrencyMeta } from '../lib/exchangeRate'

const CATEGORY_META: Record<string, { icon: string; description: string }> = {
  住居費: { icon: '🏠', description: '家賃・管理費などを入力してください' },
  光熱費: { icon: '⚡', description: '電気・ガス・水道の月額を入力してください' },
  通信費: { icon: '📱', description: 'スマホ・インターネットの月額を入力してください' },
  保険: { icon: '🛡️', description: '生命保険・医療保険などを入力してください' },
  自動車: { icon: '🚗', description: '駐車場・自動車保険・ローンを入力してください' },
  その他: { icon: '📦', description: 'その他の固定費を入力してください' },
}

// 住居費と光熱費は同一ステップでまとめて表示する
type StepKey = 'intro' | '住居費+光熱費' | '通信費' | '保険' | '自動車' | '子ども・育児' | 'subscription' | 'その他' | 'review' | 'thanks' | 'guide'

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
    key: 'intro',
    icon: '📋',
    title: '固定費一覧へようこそ',
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
const GUIDE_ITEMS: { icon: string; title: string; description: string }[] = [
  { icon: '📊', title: '固定費合計をひと目で確認', description: '画面上部のカードで、毎月の固定費合計がすぐにわかります。' },
  { icon: '🗂️', title: 'タブで絞り込み', description: '「契約中」「解約済み」「見直し中」でタブを切り替えて確認できます。' },
  { icon: '👆', title: 'タップして編集', description: '項目をタップすると、金額の変更や解約の記録ができます。' },
  { icon: '➕', title: '新しい固定費を追加', description: '右下の＋ボタンから、いつでも新しい固定費を追加できます。' },
]

// StepKey に対応するカテゴリ一覧（住居費+光熱費 は2カテゴリ）
const STEP_CATEGORIES: Record<string, string[]> = {
  '住居費+光熱費': ['住居費', '光熱費'],
  通信費: ['通信費'],
  保険: ['保険'],
  自動車: ['自動車'],
  '子ども・育児': ['子ども・育児'],
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
    <div className="flex flex-col flex-1 min-h-0">
      {/* タブ */}
      <div className="flex flex-wrap gap-1 pb-2 mb-3 shrink-0">
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
                'flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition border ' +
                (activeTab === sub.name
                  ? 'bg-emerald-500 text-white border-emerald-500'
                  : 'bg-white text-slate-500 border-slate-200')
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
      <div className="space-y-2 flex-1 overflow-y-auto pr-1">
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

interface CustomItemStepProps {
  items: MultiItem[]
  onAdd: (item: MultiItem) => void
  onRemove: (index: number) => void
}

function CustomItemStep({ items, onAdd, onRemove }: CustomItemStepProps) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState(FIXED_EXPENSE_CATEGORIES[FIXED_EXPENSE_CATEGORIES.length - 1].name)
  const [amount, setAmount] = useState('')
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly')

  function handleAdd() {
    const trimmed = name.trim()
    if (!trimmed) return
    onAdd({ name: trimmed, category, amount, cycle })
    setName('')
    setAmount('')
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* 追加フォーム */}
      <div className="space-y-2 mb-4 shrink-0 bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: 町内会費"
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
        />
        <div className="flex gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="flex-1 min-w-0 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300"
          >
            {FIXED_EXPENSE_CATEGORIES.map((c) => (
              <option key={c.name} value={c.name}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
          <div className="flex rounded-xl overflow-hidden border border-slate-200 shrink-0 text-xs">
            <button
              type="button"
              onClick={() => setCycle('monthly')}
              className={'px-3 transition ' + (cycle === 'monthly' ? 'bg-slate-700 text-white' : 'bg-white text-slate-400')}
            >
              月
            </button>
            <button
              type="button"
              onClick={() => setCycle('yearly')}
              className={'px-3 transition border-l border-slate-200 ' + (cycle === 'yearly' ? 'bg-slate-700 text-white' : 'bg-white text-slate-400')}
            >
              年
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">円</span>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!name.trim()}
            className="px-4 rounded-xl bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-semibold active:bg-emerald-600 shrink-0"
          >
            追加
          </button>
        </div>
      </div>

      {/* 追加済みリスト */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {items.length === 0 ? (
          <p className="text-sm text-slate-400">まだ項目が追加されていません</p>
        ) : (
          items.map((item, i) => {
            const catInfo = FIXED_EXPENSE_CATEGORIES.find((c) => c.name === item.category)
            return (
              <div key={`${item.name}-${i}`} className="flex items-center gap-3 bg-white rounded-xl px-3 py-2.5 shadow-sm">
                <span className="text-lg shrink-0">{catInfo?.icon ?? '📦'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-700 truncate">{item.name}</div>
                  <div className="text-xs text-slate-400">
                    {item.category}
                    {item.cycle === 'yearly' ? '・年払い' : ''}
                  </div>
                </div>
                <span className="text-sm text-slate-600 shrink-0">
                  {item.amount ? `¥${Number(item.amount).toLocaleString()}` : '-'}
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  className="text-slate-300 active:text-rose-500 shrink-0 text-lg leading-none px-1"
                  aria-label="削除"
                >
                  ×
                </button>
              </div>
            )
          })
        )}
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

// データ入力ステップのキー一覧（データ入力以外の案内ステップを除く）
const NON_DATA_STEP_KEYS: StepKey[] = ['intro', 'subscription', 'その他', 'review', 'thanks', 'guide']
const DATA_STEP_KEYS = STEPS.filter((s) => !NON_DATA_STEP_KEYS.includes(s.key)).map((s) => s.key)

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
  const [customItems, setCustomItems] = useState<MultiItem[]>(() =>
    fixedExpenses
      .filter((f) => f.category === 'その他')
      .map((f) => ({
        name: f.name,
        category: f.category,
        cycle: f.cycle === 'yearly' ? ('yearly' as const) : ('monthly' as const),
        amount: f.amount != null ? f.amount.toString() : '',
      }))
  )
  const [reviewingNames, setReviewingNames] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [wishItem, setWishItem] = useState<{ name: string; target_amount: number | null } | null>(null)

  useEffect(() => {
    wishlistService.fetchByUser(userId).then((items) => {
      const top = items.find((i) => i.priority === 1) ?? items[0] ?? null
      if (top) setWishItem({ name: top.name, target_amount: top.target_amount })
    })
  }, [userId])

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

  function addCustomItem(item: MultiItem) {
    setCustomItems((prev) => [...prev, item])
  }

  function removeCustomItem(index: number) {
    setCustomItems((prev) => prev.filter((_, i) => i !== index))
  }

  const isLast = stepIndex === STEPS.length - 1
  const today = new Date().toISOString().slice(0, 10)

  // review ページ用: 入力・選択済み項目を集計
  const reviewItems = useMemo(() => {
    const usdRate = getUsdJpyRate()
    const items: { name: string; category: string; displayAmount: string; yearlyAmount: number }[] = []
    ;[...multiItems, customItems].forEach((stepItems) => {
      stepItems.forEach((item) => {
        const amt = parseFloat(item.amount)
        if (!isNaN(amt) && amt > 0) {
          const yearly = item.cycle === 'yearly' ? amt : amt * 12
          items.push({ name: item.name, category: item.category, displayAmount: `¥${amt.toLocaleString()}`, yearlyAmount: yearly })
        }
      })
    })
    SUBSCRIPTION_PRESETS.filter((p) => selectedSubs.has(p.name)).forEach((p) => {
      const cycle = cycleOverrides.get(p.name) ?? p.cycle
      const displayAmount = p.currency === 'USD'
        ? cycle === 'yearly'
          ? `$${(p.usdYearlyAmount ?? p.usdAmount ?? 0).toLocaleString()}/年`
          : `$${(p.usdAmount ?? 0).toLocaleString()}/月`
        : cycle === 'yearly'
          ? `¥${(p.yearlyAmount ?? p.amount).toLocaleString()}/年`
          : `¥${p.amount.toLocaleString()}/月`
      let yearly: number
      if (p.currency === 'USD') {
        const usdAmt = cycle === 'yearly' ? (p.usdYearlyAmount ?? p.usdAmount ?? 0) : (p.usdAmount ?? 0) * 12
        yearly = Math.round(usdAmt * usdRate)
      } else {
        yearly = cycle === 'yearly' ? (p.yearlyAmount ?? p.amount) : p.amount * 12
      }
      items.push({ name: p.name, category: 'サブスク', displayAmount, yearlyAmount: yearly })
    })
    return items
  }, [multiItems, customItems, selectedSubs, cycleOverrides])

  const reviewingTotal = useMemo(
    () => reviewItems.filter((i) => reviewingNames.has(i.name)).reduce((s, i) => s + i.yearlyAmount, 0),
    [reviewItems, reviewingNames]
  )

  // 「お疲れ様でした」画面で表示する、登録済み固定費の月額換算合計
  const registeredMonthlyTotal = useMemo(
    () => reviewItems.reduce((s, i) => s + i.yearlyAmount, 0) / 12,
    [reviewItems]
  )

  async function handleNext() {
    const currentKey = STEPS[stepIndex].key

    if (currentKey !== 'review') {
      if (isLast) {
        onComplete()
      } else {
        setStepIndex((i) => i + 1)
      }
      return
    }

    setSaving(true)
    type InsertRow = Parameters<typeof fixedExpenseService.insertMany>[0][number]
    const inserts: InsertRow[] = []
    const updates: { id: string; amount: number; status: FixedExpense['status'] }[] = []

    // multi ステップ・自由入力（その他）の保存 — item.category を使うので正確なカテゴリで保存される
    ;[...multiItems, customItems].forEach((items) => {
      items.forEach((item) => {
        const amt = parseFloat(item.amount)
        if (isNaN(amt) || amt < 0) return
        const existing = fixedExpenses.find(
          (f) => f.name === item.name && f.category === item.category
        )
        const status: FixedExpense['status'] = amt === 0 ? 'unsubscribed' : reviewingNames.has(item.name) ? 'reviewing' : 'active'
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
          status: reviewingNames.has(p.name) ? 'reviewing' : 'active',
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
          status: reviewingNames.has(p.name) ? 'reviewing' : 'active',
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
    setStepIndex((i) => i + 1)
  }

  const totalSteps = STEPS.length

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-emerald-50 to-white flex flex-col max-w-md mx-auto">
      {/* 右上バツボタン */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-slate-400 active:bg-slate-100 z-10"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* ドットインジケーター */}
      <div className="flex justify-center gap-2 pt-10 pb-2">
        {STEPS.map((_, i) => (
          <span
            key={i}
            className={`block rounded-full transition-all duration-300 ${
              i === stepIndex ? 'w-6 h-2 bg-emerald-500' : 'w-2 h-2 bg-slate-300'
            }`}
          />
        ))}
      </div>

      {/* カルーセルコンテンツ */}
      <div className="flex-1 overflow-hidden min-h-0">
        <div
          className="flex h-full transition-transform duration-300 ease-in-out"
          style={{ transform: `translateX(-${stepIndex * (100 / totalSteps)}%)`, width: `${totalSteps * 100}%` }}
        >
          {STEPS.map((s, si) => {
            const dsi = DATA_STEP_KEYS.indexOf(s.key)
            const isActive = stepIndex === si
            return (
              <div
                key={s.key}
                className="flex flex-col h-full"
                style={{ width: `${100 / totalSteps}%` }}
                {...(!isActive ? { inert: '' } : {})}
              >
                {s.key === 'review' ? (
                  <div className="flex flex-col px-8 pt-6 h-full min-h-0">
                    <div className="flex items-center gap-3 mb-3 shrink-0">
                      <span className="text-3xl">{s.icon}</span>
                      <div>
                        <div className="font-bold text-slate-800">{s.title}</div>
                        <div className="text-xs text-slate-400">{s.description}</div>
                      </div>
                    </div>

                    {/* 欲しいもの×削減効果パネル */}
                    {wishItem && wishItem.target_amount != null && wishItem.target_amount > 0 && (() => {
                      const pct = Math.min(100, Math.round((reviewingTotal / wishItem.target_amount) * 100))
                      const monthsNeeded = reviewingTotal > 0
                        ? Math.ceil(wishItem.target_amount / (reviewingTotal / 12))
                        : null
                      return (
                        <div className="shrink-0 mb-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 text-white">
                          <div className="text-xs font-medium text-emerald-100 mb-0.5">🎯 目標</div>
                          <div className="flex items-baseline justify-between mb-3">
                            <span className="text-base font-bold">{wishItem.name}</span>
                            <span className="text-xl font-bold">¥{wishItem.target_amount.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs text-emerald-100">見直し削減効果（年間）</span>
                            <span className="text-base font-bold text-yellow-300">¥{reviewingTotal.toLocaleString()}</span>
                          </div>
                          <div className="w-full bg-white/30 rounded-full h-2.5 overflow-hidden mb-1">
                            <div
                              className="h-2.5 rounded-full bg-yellow-300 transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs text-emerald-100">
                            <span>
                              {monthsNeeded != null
                                ? `削減分で${monthsNeeded}ヶ月後に購入可能`
                                : '項目を選択すると購入時期を計算します'}
                            </span>
                            <span>{pct}%</span>
                          </div>
                        </div>
                      )
                    })()}

                    {reviewItems.length === 0 ? (
                      <p className="text-sm text-slate-400 mt-4">入力・選択された項目がありません</p>
                    ) : (
                      <div className="flex-1 overflow-y-auto mt-3 space-y-2 pr-1">
                        {reviewItems.map((item) => {
                          const checked = reviewingNames.has(item.name)
                          return (
                            <button
                              key={item.name}
                              type="button"
                              onClick={() =>
                                setReviewingNames((prev) => {
                                  const next = new Set(prev)
                                  if (next.has(item.name)) next.delete(item.name)
                                  else next.add(item.name)
                                  return next
                                })
                              }
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition ${
                                checked ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-white'
                              }`}
                            >
                              <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                                checked ? 'border-amber-500 bg-amber-500' : 'border-slate-300'
                              }`}>
                                {checked && <span className="text-white text-xs font-bold">✓</span>}
                              </span>
                              <span className="flex-1 text-sm text-slate-700">{item.name}</span>
                              <span className="text-xs text-slate-400 shrink-0">{item.category}</span>
                              <span className="text-xs text-slate-500 shrink-0">{item.displayAmount}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ) : s.key === 'intro' ? (
                  <div className="flex flex-col items-center justify-center px-8 text-center h-full">
                    <div className="text-5xl mb-6">📋</div>
                    <h2 className="text-xl font-bold text-slate-800 mb-4">{s.title}</h2>
                    <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
                      <p>このページは<span className="font-semibold text-slate-800">固定費の一覧画面</span>です。</p>
                      <p>家賃・通信費・サブスクなど、毎月かならず出ていく費用をここに登録することで、節約できるポイントが一目でわかるようになります。</p>
                      <p>次のステップで、基本的な固定費を一緒に入力していきましょう 💪</p>
                    </div>
                  </div>
                ) : s.key === 'thanks' ? (
                  <div className="flex flex-col items-center justify-center px-8 text-center h-full">
                    <div className="text-5xl mb-6">🎉</div>
                    <h2 className="text-xl font-bold text-slate-800 mb-4">{s.title}</h2>
                    <p className="text-sm text-slate-600 leading-relaxed mb-1">
                      基本的な固定費の登録が完了しました。
                    </p>
                    <p className="text-sm text-slate-500 leading-relaxed mb-6">
                      最後に、固定費画面の使い方を簡単にご紹介します 📖
                    </p>
                    {registeredMonthlyTotal > 0 && (
                      <div className="bg-emerald-50 rounded-2xl px-5 py-4 w-full">
                        <div className="text-xs text-emerald-600 font-medium mb-1">登録した固定費（月額換算）</div>
                        <div className="text-2xl font-bold text-emerald-700">
                          ¥{Math.round(registeredMonthlyTotal).toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                ) : s.key === 'その他' ? (
                  <div className="flex flex-col px-8 pt-6 h-full min-h-0">
                    <div className="flex items-center gap-3 mb-5 shrink-0">
                      <span className="text-3xl">{s.icon}</span>
                      <div>
                        <div className="font-bold text-slate-800">{s.title}</div>
                        <div className="text-xs text-slate-400">{s.description}</div>
                      </div>
                    </div>
                    <CustomItemStep items={customItems} onAdd={addCustomItem} onRemove={removeCustomItem} />
                  </div>
                ) : s.key === 'guide' ? (
                  <div className="flex flex-col px-8 pt-6 h-full min-h-0">
                    <div className="flex items-center gap-3 mb-5 shrink-0">
                      <span className="text-3xl">{s.icon}</span>
                      <div>
                        <div className="font-bold text-slate-800">{s.title}</div>
                        <div className="text-xs text-slate-400">{s.description}</div>
                      </div>
                    </div>
                    <div className="space-y-3 overflow-y-auto pr-1">
                      {GUIDE_ITEMS.map((item) => (
                        <div key={item.title} className="flex items-start gap-3 bg-slate-50 rounded-xl p-3">
                          <span className="text-xl shrink-0">{item.icon}</span>
                          <div>
                            <div className="text-sm font-semibold text-slate-700">{item.title}</div>
                            <div className="text-xs text-slate-500 leading-relaxed">{item.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col px-8 pt-6 h-full min-h-0">
                    <div className="flex items-center gap-3 mb-5 shrink-0">
                      <span className="text-3xl">{s.icon}</span>
                      <div>
                        <div className="font-bold text-slate-800">{s.title}</div>
                        <div className="text-xs text-slate-400">{s.description}</div>
                      </div>
                    </div>
                    {s.key !== 'subscription' && dsi >= 0 && (
                      <MultiStep
                        items={multiItems[dsi]}
                        showCategoryHeaders={s.key === '住居費+光熱費'}
                        onChange={(items) =>
                          setMultiItems((prev) => prev.map((it, i) => (i === dsi ? items : it)))
                        }
                      />
                    )}
                    {s.key === 'subscription' && (
                      <SubscriptionStep
                        selected={selectedSubs}
                        cycleOverrides={cycleOverrides}
                        onToggle={toggleSub}
                        onCycleChange={setCycleOverride}
                      />
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ナビゲーションボタン */}
      <div className="px-8 pb-10 pt-4">
        <button
          onClick={handleNext}
          disabled={saving}
          className="w-full bg-emerald-500 active:bg-emerald-600 disabled:opacity-50 text-white font-semibold py-4 rounded-xl text-base transition-colors"
        >
          {saving
            ? '保存中...'
            : STEPS[stepIndex].key === 'review'
              ? '保存して次へ →'
              : isLast
                ? 'はじめる'
                : '次へ →'}
        </button>
        <div className="flex justify-between mt-3">
          {stepIndex > 0 && (
            <button
              onClick={() => setStepIndex((i) => i - 1)}
              className="text-slate-400 text-sm py-2 px-2 active:text-slate-600"
            >
              ← 戻る
            </button>
          )}
          {stepIndex === 0 && <span />}
          {!isLast && stepIndex > 0 && STEPS[stepIndex].key !== 'review' && (
            <button
              onClick={() => setStepIndex((i) => i + 1)}
              className="text-slate-400 text-sm py-2 px-2 active:text-slate-600"
            >
              スキップ
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
