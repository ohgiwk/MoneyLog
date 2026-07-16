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
  const [errors, setErrors] = useState<string[]>([])
  const [categoryMode, setCategoryMode] = useState<'total' | 'detail'>(
    () => (localStorage.getItem(`budgetCategoryMode_${userId}`) as 'total' | 'detail') ?? 'detail'
  )
  const [categoryTotal, setCategoryTotal] = useState(0)

  const { data: fetchedBudget, isError } = useBudgetQuery(userId, month)
  const mutation = useBudgetMutation(userId, month)

  // サーバーから取得したデータをフォームに反映（月切替時もリセット）
  useEffect(() => {
    if (fetchedBudget) {
      setBudget(fetchedBudget)
      setCategoryTotal(oneTimeBudgetTotal(fetchedBudget))
      setSaved(false)
    }
  }, [fetchedBudget])

  const fetchError = isError ? 'データの読み込みに失敗しました' : mutation.isError ? '保存に失敗しました' : null

  function handleChange(field: 'income' | 'fixed' | 'consumable' | 'savings', value: string) {
    const n = parseInt(value.replace(/[^0-9]/g, ''), 10)
    setBudget((prev) => ({ ...prev, [field]: isNaN(n) ? 0 : n }))
    setSaved(false)
    setErrors([])
  }

  function handleCategoryChange(category: string, value: string) {
    const n = parseInt(value.replace(/[^0-9]/g, ''), 10)
    setBudget((prev) => ({
      ...prev,
      oneTimeByCategory: { ...prev.oneTimeByCategory, [category]: isNaN(n) ? 0 : n },
    }))
    setSaved(false)
    setErrors([])
  }

  function handleCategoryModeSwitch(mode: 'total' | 'detail') {
    if (mode === 'total') {
      setCategoryTotal(oneTimeBudgetTotal(budget))
    }
    setCategoryMode(mode)
    setSaved(false)
    setErrors([])
  }

  function handleCategoryTotalChange(value: string) {
    const n = parseInt(value.replace(/[^0-9]/g, ''), 10)
    setCategoryTotal(isNaN(n) ? 0 : n)
    setSaved(false)
    setErrors([])
  }

  async function handleSave() {
    const errs: string[] = []
    if (budget.income <= 0) errs.push('収入を入力してください')
    if (remaining !== 0) errs.push('収入と支出合計（貯蓄＋固定費＋出費）が一致していません')
    if (errs.length > 0) { setErrors(errs); return }
    setErrors([])
    let finalBudget = budget
    if (categoryMode === 'total') {
      const n = EXPENSE_CATEGORIES.length
      const base = Math.floor(categoryTotal / n)
      const rem = categoryTotal - base * n
      const distributed = Object.fromEntries(
        EXPENSE_CATEGORIES.map((cat, i) => [cat.name, base + (i === 0 ? rem : 0)])
      )
      finalBudget = { ...budget, oneTimeByCategory: distributed }
    }
    await mutation.mutateAsync(finalBudget)
    localStorage.setItem(`budgetCategoryMode_${userId}`, categoryMode)
    setSaved(true)
  }

  const detailOneTimeTotal = oneTimeBudgetTotal(budget)
  const oneTimeTotal = categoryMode === 'total' ? categoryTotal : detailOneTimeTotal
  const savings = budget.savings ?? 0
  const budgetTotal = budget.fixed + oneTimeTotal + savings
  const { pct: usagePct, over: overIncome } = calcBudgetProgress(budgetTotal, budget.income)
  const remaining = budget.income - budgetTotal

  return (
    <div className="max-w-md mx-auto h-[100dvh] bg-surface-subtle flex flex-col overflow-hidden">
      {/* ヘッダー */}
      <div className="bg-surface border-b border-line-subtle">
        <ScreenHeader title="予算設定" onBack={() => navigate(-1)} />
      </div>

      <MonthSwitcher month={month} setMonth={setMonth} />

      <div className="flex-1 p-4 space-y-4 overflow-y-auto pb-48">
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

        {/* 貯蓄 */}
        <div className="bg-surface rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <span>🏦</span>
            貯蓄
          </div>
          <BudgetField
            label="貯蓄額（月）"
            value={budget.savings}
            onChange={(v) => handleChange('savings', v)}
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

          {/* 出費（カテゴリ別 / 合計） */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div />
              <div className="flex rounded-lg overflow-hidden border border-line-subtle text-xs">
                <button
                  type="button"
                  onClick={() => handleCategoryModeSwitch('total')}
                  className={`px-2.5 py-1 ${categoryMode === 'total' ? 'bg-primary-500 text-white' : 'text-ink-muted active:bg-surface-subtle'}`}
                >
                  合計
                </button>
                <button
                  type="button"
                  onClick={() => handleCategoryModeSwitch('detail')}
                  className={`px-2.5 py-1 ${categoryMode === 'detail' ? 'bg-primary-500 text-white' : 'text-ink-muted active:bg-surface-subtle'}`}
                >
                  カテゴリ別
                </button>
              </div>
            </div>
            {categoryMode === 'total' ? (
              <BudgetField
                label="通常出費"
                value={categoryTotal}
                onChange={handleCategoryTotalChange}
              />
            ) : (
              <div className="space-y-3">
                {EXPENSE_CATEGORIES.map((cat) => (
                  <BudgetField
                    key={cat.name}
                    label={`${cat.icon} ${cat.name}`}
                    value={budget.oneTimeByCategory[cat.name] ?? 0}
                    onChange={(v) => handleCategoryChange(cat.name, v)}
                  />
                ))}
                {detailOneTimeTotal > 0 && (
                  <div className="text-right text-xs text-warning-600 font-medium">
                    合計 {formatYen(detailOneTimeTotal)}/月
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* フローティング: 予算使用率 */}
      {budget.income > 0 && (
        <div className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] left-0 right-0 max-w-md mx-auto px-4 z-20">
          <div className="bg-income-50 dark:bg-income-950/80 rounded-2xl px-4 py-2.5 shadow-lg space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-income-700 dark:text-income-400">予算使用率</div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-ink-muted">{formatYen(budgetTotal)} / {formatYen(budget.income)}</span>
                <span className={`font-bold ${overIncome ? 'text-danger-500' : 'text-income-700 dark:text-income-400'}`}>
                  {Math.round((budgetTotal / budget.income) * 100)}%
                </span>
              </div>
            </div>
            <div className="h-2 bg-income-100 dark:bg-income-900/50 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${overIncome ? 'bg-danger-400' : 'bg-income-500 dark:bg-income-600'}`}
                style={{ width: `${usagePct}%` }}
              />
            </div>
            <div className="text-right text-xs">
              <span className={overIncome ? 'text-danger-500 font-semibold' : 'text-ink-muted'}>
                {overIncome ? `${formatYen(Math.abs(remaining))} オーバー` : `残り ${formatYen(remaining)}`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* フローティング: 保存ボタン */}
      <div className="fixed bottom-[calc(2rem+env(safe-area-inset-bottom))] left-0 right-0 max-w-md mx-auto px-4 z-20 flex flex-col items-center gap-1">
        {errors.length > 0 && (
          <div className="w-full bg-danger-50 border border-danger-200 rounded-xl px-3 py-2 space-y-0.5">
            {errors.map((e) => (
              <p key={e} className="text-xs text-danger-600">{e}</p>
            ))}
          </div>
        )}
        <Button size="fab" onClick={handleSave} className="w-[60%]">
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
