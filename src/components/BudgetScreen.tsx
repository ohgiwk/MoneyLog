import { useEffect, useState } from 'react'
import { EXPENSE_CATEGORIES } from '../constants'
import { budgetService, oneTimeBudgetTotal, type BudgetSettings } from '../lib/services/budgetService'
import { calcBudgetProgress, formatYen, todayStr } from '../utils'
import MonthSwitcher from './ui/MonthSwitcher'
import ScreenHeader from './ui/ScreenHeader'

interface Props {
  userId: string
  onBack: () => void
}

export default function BudgetScreen({ userId, onBack }: Props) {
  useEffect(() => { window.scrollTo(0, 0) }, [])
  const [month, setMonth] = useState(todayStr().slice(0, 7))
  const [budget, setBudget] = useState<BudgetSettings>({ income: 0, fixed: 0, consumable: 0, oneTimeByCategory: {} })
  const [saved, setSaved] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setFetchError(null)
      setSaved(false)
      try {
        setBudget(await budgetService.fetchByMonth(userId, month))
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : 'データの読み込みに失敗しました')
      }
    }
    void load()
  }, [userId, month])

  function handleChange(field: 'income' | 'fixed' | 'consumable', value: string) {
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

  async function handleSave() {
    setFetchError(null)
    try {
      await budgetService.save(userId, month, budget)
      setSaved(true)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : '保存に失敗しました')
    }
  }

  const oneTimeTotal = oneTimeBudgetTotal(budget)
  const budgetTotal = budget.fixed + budget.consumable + oneTimeTotal
  const { pct: usagePct, over: overIncome } = calcBudgetProgress(budgetTotal, budget.income)
  const remaining = budget.income - budgetTotal

  return (
    <div className="max-w-md mx-auto h-[100dvh] bg-surface-subtle flex flex-col overflow-hidden">
      {/* ヘッダー */}
      <div className="bg-surface border-b border-line-subtle">
        <ScreenHeader title="予算設定" onBack={onBack} />
      </div>

      <MonthSwitcher month={month} setMonth={setMonth} />

      <div className="flex-1 p-4 space-y-4 overflow-y-auto pb-8">
        {fetchError && (
          <div className="bg-danger-50 border border-danger-200 rounded-xl px-4 py-3 text-sm text-danger-600">
            {fetchError}
          </div>
        )}

        {/* 収入 */}
        <div className="bg-surface rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <span>💰</span>
            収入
          </div>
          <BudgetField
            label="収入（月）"
            value={budget.income}
            onChange={(v) => handleChange('income', v)}
          />
        </div>

        {/* 固定費・定期購入・出費 */}
        <div className="bg-surface rounded-2xl p-4 shadow-sm space-y-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <span>💸</span>
            支出
          </div>

          {/* 固定費 */}
          <div className="space-y-3">
            <BudgetField
              label="固定費"
              value={budget.fixed}
              onChange={(v) => handleChange('fixed', v)}
            />
          </div>

          {/* 定期購入 */}
          <div className="space-y-3">
            <BudgetField
              label="定期購入"
              value={budget.consumable}
              onChange={(v) => handleChange('consumable', v)}
            />
          </div>

          <div className="h-px bg-surface-hover" />

          {/* 出費（カテゴリ別） */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <span>⚡</span>
                カテゴリ別出費
              </div>
              {oneTimeTotal > 0 && (
                <span className="text-xs text-warning-600 font-medium">
                  合計 {formatYen(oneTimeTotal)}/月
                </span>
              )}
            </div>
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
          </div>
        </div>

        {/* 収入に対する予算使用率 */}
        {budget.income > 0 && (
          <div className="bg-primary-50 rounded-2xl p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-primary-700">予算使用率</div>
              <span className={`text-sm font-bold ${overIncome ? 'text-danger-500' : 'text-primary-700'}`}>
                {Math.round((budgetTotal / budget.income) * 100)}%
              </span>
            </div>
            <div className="h-2.5 bg-primary-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${overIncome ? 'bg-danger-400' : 'bg-primary-500'}`}
                style={{ width: `${usagePct}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-xs text-primary-700/80">
              <span>
                予算合計 {formatYen(budgetTotal)} / 収入 {formatYen(budget.income)}
              </span>
              <span className={overIncome ? 'text-danger-500 font-semibold' : 'text-primary-700/80'}>
                {overIncome
                  ? `${formatYen(Math.abs(remaining))} オーバー`
                  : `残り ${formatYen(remaining)}`}
              </span>
            </div>
          </div>
        )}

        <button
          onClick={handleSave}
          className="w-full bg-primary-500 active:bg-primary-600 text-white font-semibold rounded-2xl py-3.5 text-sm transition"
        >
          {saved ? '✓ 保存しました' : '保存する'}
        </button>
      </div>
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
      <span className="text-sm text-ink flex-1 min-w-0 truncate">{label}</span>
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-ink-muted text-xs">¥</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={value === 0 ? '' : value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className="w-28 border border-line rounded-xl px-3 py-2 text-sm text-right text-ink-strong focus:outline-none focus:ring-2 focus:ring-primary-400"
        />
      </div>
    </div>
  )
}
