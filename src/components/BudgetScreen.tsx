import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EXPENSE_CATEGORIES } from '../constants'
import { budgetService, oneTimeBudgetTotal, EMPTY_BUDGET_SETTINGS, type BudgetSettings } from '../lib/services/budgetService'
import { useBudgetQuery, useBudgetMutation } from '../hooks/queries/useBudgetQuery'
import { useTransactionsQuery } from '../hooks/queries/useTransactionsQuery'
import { calcBudgetProgress, formatYen, shiftMonth, todayStr } from '../utils'
import MonthSwitcher from './ui/MonthSwitcher'
import ScreenHeader from './ui/ScreenHeader'
import Button from './ui/Button'
import Input from './ui/Input'

interface Props {
  userId: string
}

export default function BudgetScreen({ userId }: Props) {
  const navigate = useNavigate()
  useEffect(() => { window.scrollTo(0, 0) }, [])
  const [month, setMonth] = useState(todayStr().slice(0, 7))
  const [budget, setBudget] = useState<BudgetSettings>(EMPTY_BUDGET_SETTINGS)
  const [saved, setSaved] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [categoryMode, setCategoryMode] = useState<'total' | 'detail'>(
    () => (localStorage.getItem(`budgetCategoryMode_${userId}`) as 'total' | 'detail') ?? 'detail'
  )
  const [categoryTotal, setCategoryTotal] = useState(0)

  const [menuOpen, setMenuOpen] = useState(false)
  const [copyMsg, setCopyMsg] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const { data: fetchedBudget, isError } = useBudgetQuery(userId, month)
  const mutation = useBudgetMutation(userId, month)

  const lastMonth = useMemo(() => shiftMonth(month, -1), [month])
  const { data: lastMonthTxs = [] } = useTransactionsQuery(userId, lastMonth)

  const lastMonthOneTimeByCat = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of lastMonthTxs) {
      if (t.type !== 'expense' || t.expense_kind !== 'one_time') continue
      map[t.category] = (map[t.category] ?? 0) + t.amount
    }
    return map
  }, [lastMonthTxs])

  const lastMonthOneTimeTotal = useMemo(
    () => Object.values(lastMonthOneTimeByCat).reduce((s, v) => s + v, 0),
    [lastMonthOneTimeByCat]
  )

  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  async function handleCopyLastMonth() {
    setMenuOpen(false)
    const [year, mon] = month.split('-').map(Number)
    const prev = mon === 1
      ? `${year - 1}-12`
      : `${year}-${String(mon - 1).padStart(2, '0')}`
    const lastBudget = await budgetService.fetchByMonth(userId, prev)
    if (!lastBudget || lastBudget.income === 0) {
      setCopyMsg('先月の予算データがありません')
      setTimeout(() => setCopyMsg(null), 3000)
      return
    }
    setBudget(lastBudget)
    setCategoryTotal(oneTimeBudgetTotal(lastBudget))
    setSaved(false)
    setCopyMsg('先月の予算をコピーしました')
    setTimeout(() => setCopyMsg(null), 3000)
  }

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
        <ScreenHeader
          title="予算設定"
          onBack={() => navigate(-1)}
          rightAction={
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="text-ink-muted active:text-ink p-1"
                aria-label="メニュー"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                </svg>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-surface rounded-xl shadow-lg border border-line-subtle z-50 overflow-hidden">
                  <button
                    onClick={handleCopyLastMonth}
                    className="w-full text-left px-4 py-3 text-sm text-ink active:bg-surface-subtle"
                  >
                    先月の予算をコピー
                  </button>
                </div>
              )}
            </div>
          }
        />
      </div>

      <MonthSwitcher month={month} setMonth={setMonth} />

      <div className="flex-1 p-4 space-y-4 overflow-y-auto pb-48">
        {copyMsg && (
          <div className="bg-primary-50 dark:bg-primary-950/50 border border-primary-200 dark:border-primary-800 rounded-xl px-4 py-3 text-sm text-primary-700 dark:text-primary-300">
            {copyMsg}
          </div>
        )}
        {fetchError && (
          <div className="bg-danger-50 border border-danger-200 rounded-xl px-4 py-3 text-sm text-danger-600">
            {fetchError}
          </div>
        )}

        {/* 収入 */}
        <div className="bg-surface rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink pb-3 -mx-4 px-4 border-b border-income-400">
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
          <div className="flex items-center gap-2 text-sm font-semibold text-ink pb-3 -mx-4 px-4 border-b border-income-400">
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
          <div className="flex items-center gap-2 text-sm font-semibold text-ink pb-3 -mx-4 px-4 border-b border-danger-400">
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
                actual={lastMonthOneTimeTotal > 0 ? lastMonthOneTimeTotal : undefined}
              />
            ) : (
              <div className="space-y-3">
                {EXPENSE_CATEGORIES.map((cat) => (
                  <BudgetField
                    key={cat.name}
                    label={`${cat.icon} ${cat.name}`}
                    value={budget.oneTimeByCategory[cat.name] ?? 0}
                    onChange={(v) => handleCategoryChange(cat.name, v)}
                    actual={lastMonthOneTimeTotal > 0 ? (lastMonthOneTimeByCat[cat.name] ?? 0) : undefined}
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
  actual,
}: {
  label: string
  value: number
  onChange: (v: string) => void
  actual?: number
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-sm text-ink truncate">{label}</span>
        {actual !== undefined && (
          <span className="text-xs text-ink-muted">先月実績 {formatYen(actual)}</span>
        )}
      </div>
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
