import { useEffect, useState } from 'react'
import { EXPENSE_CATEGORIES } from '../constants'
import { loadBudget, saveBudget, oneTimeBudgetTotal, type BudgetSettings } from '../lib/budgetStorage'
import { formatYen } from '../utils'

interface Props {
  userId: string
  onBack: () => void
}

export default function BudgetScreen({ userId, onBack }: Props) {
  useEffect(() => { window.scrollTo(0, 0) }, [])
  const [budget, setBudget] = useState<BudgetSettings>(() => loadBudget(userId))
  const [saved, setSaved] = useState(false)

  function handleChange(field: 'fixed' | 'consumable', value: string) {
    const n = parseInt(value.replace(/[^0-9]/g, ''), 10)
    setBudget((prev) => ({ ...prev, [field]: isNaN(n) ? 0 : n }))
    setSaved(false)
  }

  function handleCategoryChange(category: string, value: string) {
    const n = parseInt(value.replace(/[^0-9]/g, ''), 10)
    setBudget((prev) => ({
      ...prev,
      oneTimeByCategory: { ...prev.oneTimeByCategory, [category]: isNaN(n) ? 0 : n },
    }))
    setSaved(false)
  }

  function handleSave() {
    saveBudget(userId, budget)
    setSaved(true)
  }

  const oneTimeTotal = oneTimeBudgetTotal(budget)
  const weeklyFixed = Math.round(budget.fixed / 4.33)
  const weeklyConsumable = Math.round(budget.consumable / 4.33)
  const weeklyOneTime = Math.round(oneTimeTotal / 4.33)
  const weeklyTotal = weeklyFixed + weeklyConsumable + weeklyOneTime

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col">
      {/* ヘッダー */}
      <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-slate-500 active:text-slate-700 text-lg px-1"
          aria-label="戻る"
        >
          ←
        </button>
        <span className="font-semibold text-slate-800">予算設定</span>
      </div>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto pb-8">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-slate-400">
            月ごとの予算を設定すると、ホーム画面で週ごとの消費状況を確認できます。
          </p>
        </div>

        {/* 固定費 */}
        <Section title="固定費" icon="🏠">
          <BudgetField
            label="固定費（月）"
            value={budget.fixed}
            onChange={(v) => handleChange('fixed', v)}
          />
        </Section>

        {/* 定期購入 */}
        <Section title="定期購入" icon="🛒">
          <BudgetField
            label="定期購入（月）"
            value={budget.consumable}
            onChange={(v) => handleChange('consumable', v)}
          />
        </Section>

        {/* 出費（カテゴリ別） */}
        <Section
          title="出費"
          icon="⚡"
          subtitle={oneTimeTotal > 0 ? `合計 ${formatYen(oneTimeTotal)}/月` : undefined}
        >
          <div className="space-y-3">
            {EXPENSE_CATEGORIES.map((cat) => (
              <BudgetField
                key={cat.name}
                label={`${cat.icon} ${cat.name}`}
                value={budget.oneTimeByCategory[cat.name] ?? 0}
                onChange={(v) => handleCategoryChange(cat.name, v)}
              />
            ))}
          </div>
        </Section>

        {/* 週予算プレビュー */}
        <div className="bg-emerald-50 rounded-2xl p-4 shadow-sm">
          <div className="text-sm font-semibold text-emerald-700 mb-2">週あたりの予算（目安）</div>
          <div className="space-y-1.5">
            <WeeklyRow label="固定費" amount={weeklyFixed} color="text-slate-600" />
            <WeeklyRow label="定期購入" amount={weeklyConsumable} color="text-blue-600" />
            <WeeklyRow label="出費" amount={weeklyOneTime} color="text-amber-600" />
            <div className="h-px bg-emerald-200 my-1" />
            <WeeklyRow label="合計" amount={weeklyTotal} color="text-emerald-700" bold />
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full bg-emerald-500 active:bg-emerald-600 text-white font-semibold rounded-2xl py-3.5 text-sm transition"
        >
          {saved ? '✓ 保存しました' : '保存する'}
        </button>
      </div>
    </div>
  )
}

function Section({
  title,
  icon,
  subtitle,
  children,
}: {
  title: string
  icon: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <span>{icon}</span>
          {title}
        </div>
        {subtitle && <span className="text-xs text-amber-600 font-medium">{subtitle}</span>}
      </div>
      {children}
    </div>
  )
}

function BudgetField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-slate-600 flex-1 min-w-0 truncate">{label}</span>
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-slate-400 text-xs">¥</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={value === 0 ? '' : value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className="w-28 border border-slate-200 rounded-xl px-3 py-2 text-sm text-right text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
      </div>
    </div>
  )
}

function WeeklyRow({
  label,
  amount,
  color,
  bold,
}: {
  label: string
  amount: number
  color: string
  bold?: boolean
}) {
  return (
    <div className="flex justify-between items-center">
      <span className={`text-xs ${bold ? 'font-semibold' : ''} text-slate-600`}>{label}</span>
      <span className={`text-sm ${bold ? 'font-bold' : 'font-medium'} ${color}`}>
        ¥{amount.toLocaleString('ja-JP')}
      </span>
    </div>
  )
}
