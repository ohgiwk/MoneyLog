import { useState, useMemo, useEffect } from 'react'
import { SUBSCRIPTION_PRESETS } from '../constants'
import { fixedExpenseService } from '../lib/services/fixedExpenseService'
import { wishlistService } from '../lib/services/wishlistService'
import type { FixedExpense } from '../lib/database.types'
import { getUsdJpyRate, setExpenseCurrencyMeta } from '../lib/exchangeRate'
import {
  STEPS,
  GUIDE_ITEMS,
  DATA_STEP_KEYS,
  buildItemsForStep,
  buildSelectedSubs,
  type StepKey,
  type MultiItem,
} from './fixedExpenseTutorial/data'
import { MultiStep } from './fixedExpenseTutorial/MultiStep'
import { SubscriptionStep } from './fixedExpenseTutorial/SubscriptionStep'
import { CustomItemStep } from './fixedExpenseTutorial/CustomItemStep'

interface Props {
  userId: string
  fixedExpenses: FixedExpense[]
  onClose: () => void
  onComplete: () => void
}

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
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-primary-50 to-white flex flex-col max-w-md mx-auto">
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
              i === stepIndex ? 'w-6 h-2 bg-primary-500' : 'w-2 h-2 bg-slate-300'
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
                        <div className="shrink-0 mb-3 bg-gradient-to-br from-primary-500 to-teal-600 rounded-2xl p-4 text-white">
                          <div className="text-xs font-medium text-primary-100 mb-0.5">🎯 目標</div>
                          <div className="flex items-baseline justify-between mb-3">
                            <span className="text-base font-bold">{wishItem.name}</span>
                            <span className="text-xl font-bold">¥{wishItem.target_amount.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs text-primary-100">見直し削減効果（年間）</span>
                            <span className="text-base font-bold text-yellow-300">¥{reviewingTotal.toLocaleString()}</span>
                          </div>
                          <div className="w-full bg-white/30 rounded-full h-2.5 overflow-hidden mb-1">
                            <div
                              className="h-2.5 rounded-full bg-yellow-300 transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs text-primary-100">
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
                                checked ? 'border-warning-400 bg-warning-50' : 'border-slate-200 bg-white'
                              }`}
                            >
                              <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                                checked ? 'border-warning-500 bg-warning-500' : 'border-slate-300'
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
                      <div className="bg-primary-50 rounded-2xl px-5 py-4 w-full">
                        <div className="text-xs text-primary-600 font-medium mb-1">登録した固定費（月額換算）</div>
                        <div className="text-2xl font-bold text-primary-700">
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
          className="w-full bg-primary-500 active:bg-primary-600 disabled:opacity-50 text-white font-semibold py-4 rounded-xl text-base transition-colors"
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
