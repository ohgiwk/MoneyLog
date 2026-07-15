import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EXPENSE_CATEGORIES } from '../constants'
import { oneTimeBudgetTotal, type BudgetSettings } from '../lib/services/budgetService'
import { useBudgetQuery, useBudgetMutation } from '../hooks/queries/useBudgetQuery'
import { calcBudgetProgress, formatYen, todayStr } from '../utils'
import MonthSwitcher from './ui/MonthSwitcher'
import ScreenHeader from './ui/ScreenHeader'
import Button from './ui/Button'
import Input from './ui/Input'

interface Props {
  userId: string
}

const emptyBudget: BudgetSettings = { income: 0, fixed: 0, consumable: 0, oneTimeByCategory: {} }

export default function BudgetScreen({ userId }: Props) {
  const navigate = useNavigate()
  useEffect(() => { window.scrollTo(0, 0) }, [])
  const [month, setMonth] = useState(todayStr().slice(0, 7))
  const [budget, setBudget] = useState<BudgetSettings>(emptyBudget)
  const [saved, setSaved] = useState(false)

  const { data: fetchedBudget, isError } = useBudgetQuery(userId, month)
  const mutation = useBudgetMutation(userId, month)

  // サーバーから取得したデータをフォームに反映（月切替時もリセット）
  useEffect(() => {
    if (fetchedBudget) {
      setBudget(fetchedBudget)
      setSaved(false)
    }
  }, [fetchedBudget])

  const fetchError = isError ? 'データの読み込みに失敗しました' : mutation.isError ? '保存に失敗しました' : null

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
    await mutation.mutateAsync(budget)
    setSaved(true)
  }

  const oneTimeTotal = oneTimeBudgetTotal(budget)
  const budgetTotal = budget.fixed + oneTimeTotal
  const { pct: usagePct, over: overIncome } = calcBudgetProgress(budgetTotal, budget.income)
  const remaining = budget.income - budgetTotal

  return (
    <div className="max-w-md mx-auto h-[100dvh] bg-surface-subtle flex flex-col overflow-hidden">
      {/* ヘッダー */}
      <div className="bg-surface border-b border-line-subtle">
        <ScreenHeader title="予算設定" onBack={() => navigate(-1)} />
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
          <div className="bg-income-50 dark:bg-income-950/50 rounded-2xl p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-income-700 dark:text-income-400">予算使用率</div>
              <span className={`text-sm font-bold ${overIncome ? 'text-danger-500' : 'text-income-700 dark:text-income-400'}`}>
                {Math.round((budgetTotal / budget.income) * 100)}%
              </span>
            </div>
            <div className="h-2.5 bg-income-100 dark:bg-income-900/50 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${overIncome ? 'bg-danger-400' : 'bg-income-500 dark:bg-income-600'}`}
                style={{ width: `${usagePct}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-xs text-income-700/80 dark:text-income-400/80">
              <span>
                予算合計 {formatYen(budgetTotal)} / 収入 {formatYen(budget.income)}
              </span>
              <span className={overIncome ? 'text-danger-500 font-semibold' : 'text-income-700/80 dark:text-income-400/80'}>
                {overIncome
                  ? `${formatYen(Math.abs(remaining))} オーバー`
                  : `残り ${formatYen(remaining)}`}
              </span>
            </div>
          </div>
        )}

        <Button fullWidth size="lg" onClick={handleSave}>
          {saved ? '✓ 保存しました' : '保存する'}
        </Button>
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
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          value={value === 0 ? '' : value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className="w-28 text-right text-ink-strong"
        />
      </div>
    </div>
  )
}
