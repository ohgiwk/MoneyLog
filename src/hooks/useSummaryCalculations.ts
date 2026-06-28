import { useMemo } from 'react'
import type { Consumable, FixedExpense, Transaction } from '../lib/database.types'
import { categoryInfo, monthKey, monthlyConsumableCost } from '../utils'
import type { loadBudget } from '../lib/budgetStorage'
import { oneTimeBudgetTotal } from '../lib/budgetStorage'

interface Options {
  transactions: Transaction[]
  fixedExpenses: FixedExpense[]
  consumables: Consumable[]
  householdMembers: number
  budget: ReturnType<typeof loadBudget>
  month: string
}

export function useSummaryCalculations({
  transactions,
  fixedExpenses,
  consumables,
  householdMembers,
  budget,
  month,
}: Options) {
  const monthTx = useMemo(
    () => transactions.filter((t) => monthKey(t.date) === month),
    [transactions, month]
  )

  const income = useMemo(
    () => monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    [monthTx]
  )

  const consumableExpense = useMemo(
    () => Math.round(consumables.reduce((s, c) => s + monthlyConsumableCost(c, householdMembers), 0)),
    [consumables, householdMembers]
  )

  const oneTimeExpense = useMemo(
    () =>
      monthTx
        .filter((t) => t.type === 'expense' && t.expense_kind === 'one_time')
        .reduce((s, t) => s + t.amount, 0),
    [monthTx]
  )

  const activeFixed = useMemo(
    () => fixedExpenses.filter((f) => f.status === 'active' || f.status === 'reviewing'),
    [fixedExpenses]
  )

  const toMonthly = (f: FixedExpense) => (f.amount ?? 0) / (f.cycle === 'yearly' ? 12 : 1)

  const totalFixed = useMemo(
    () => activeFixed.reduce((s, f) => s + toMonthly(f), 0),
    [activeFixed]
  )

  const totalSaved = useMemo(() => {
    const totalBaseline = activeFixed.reduce(
      (s, f) => s + f.baseline_amount / (f.cycle === 'yearly' ? 12 : 1),
      0
    )
    return totalBaseline - totalFixed
  }, [activeFixed, totalFixed])

  const balance = income - totalFixed - consumableExpense - oneTimeExpense

  // 今週（月曜始まり）の日付範囲
  const weekRange = useMemo(() => {
    const today = new Date()
    const dow = (today.getDay() + 6) % 7 // 0=Mon
    const mon = new Date(today)
    mon.setDate(today.getDate() - dow)
    const sun = new Date(mon)
    sun.setDate(mon.getDate() + 6)
    const fmt = (d: Date) => d.toISOString().slice(0, 10)
    return { start: fmt(mon), end: fmt(sun) }
  }, [])

  const thisWeekTx = useMemo(
    () => transactions.filter((t) => t.date >= weekRange.start && t.date <= weekRange.end),
    [transactions, weekRange]
  )

  const weekOneTimeByCat = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of thisWeekTx) {
      if (t.type !== 'expense' || t.expense_kind !== 'one_time') continue
      map.set(t.category, (map.get(t.category) ?? 0) + t.amount)
    }
    return map
  }, [thisWeekTx])

  const hasBudget = oneTimeBudgetTotal(budget) > 0 || weekOneTimeByCat.size > 0

  // 今日の日付範囲
  const dayRange = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return { start: today, end: today }
  }, [])

  const dayOneTimeByCat = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of transactions) {
      if (t.date !== dayRange.start) continue
      if (t.type !== 'expense' || t.expense_kind !== 'one_time') continue
      map.set(t.category, (map.get(t.category) ?? 0) + t.amount)
    }
    return map
  }, [transactions, dayRange])

  // 今月の臨時費カテゴリ別 (月表示用)
  const monthOneTimeByCat = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of monthTx) {
      if (t.type !== 'expense' || t.expense_kind !== 'one_time') continue
      map.set(t.category, (map.get(t.category) ?? 0) + t.amount)
    }
    return map
  }, [monthTx])

  // 今月の日数
  const daysInMonth = useMemo(() => {
    const [y, m] = month.split('-').map(Number)
    return new Date(y, m, 0).getDate()
  }, [month])

  const oneTimeCategoryRows = useMemo(() => {
    const cats = new Set([
      ...Object.keys(budget.oneTimeByCategory).filter((c) => (budget.oneTimeByCategory[c] ?? 0) > 0),
      ...[...weekOneTimeByCat.keys()],
    ])
    return [...cats].map((cat) => ({
      cat,
      icon: categoryInfo(cat).icon,
      spent: weekOneTimeByCat.get(cat) ?? 0,
      weekBudget: Math.round((budget.oneTimeByCategory[cat] ?? 0) / 4.33),
      daySpent: dayOneTimeByCat.get(cat) ?? 0,
      dayBudget: Math.round((budget.oneTimeByCategory[cat] ?? 0) / daysInMonth),
      monthSpent: monthOneTimeByCat.get(cat) ?? 0,
      monthBudget: budget.oneTimeByCategory[cat] ?? 0,
    }))
  }, [budget.oneTimeByCategory, weekOneTimeByCat, dayOneTimeByCat, monthOneTimeByCat, daysInMonth])

  const oneTimeByCat = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of monthTx) {
      if (t.type !== 'expense' || t.expense_kind !== 'one_time') continue
      map.set(t.category, (map.get(t.category) ?? 0) + t.amount)
    }
    return [...map.entries()].sort(([, a], [, b]) => b - a)
  }, [monthTx])

  const fixedByCat = useMemo(() => {
    const map = new Map<string, number>()
    for (const f of activeFixed) {
      const amt = toMonthly(f)
      map.set(f.category, (map.get(f.category) ?? 0) + amt)
    }
    return [...map.entries()].sort(([, a], [, b]) => b - a)
  }, [activeFixed])

  const consumableByCat = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of consumables) {
      const amt = monthlyConsumableCost(c, householdMembers)
      map.set(c.category, (map.get(c.category) ?? 0) + amt)
    }
    return [...map.entries()].sort(([, a], [, b]) => b - a)
  }, [consumables, householdMembers])

  const hasBreakdown = fixedByCat.length > 0 || consumableByCat.length > 0 || oneTimeByCat.length > 0

  return {
    income,
    consumableExpense,
    oneTimeExpense,
    totalFixed,
    totalSaved,
    balance,
    weekRange,
    dayRange,
    daysInMonth,
    hasBudget,
    oneTimeCategoryRows,
    oneTimeByCat,
    fixedByCat,
    consumableByCat,
    hasBreakdown,
  }
}
