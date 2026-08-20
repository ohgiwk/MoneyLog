import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { transactionService } from '../lib/services/transactionService'
import { supabase } from '../lib/supabase'
import { useProfileQuery } from './queries/useProfileQuery'
import { useBudgetQuery } from './queries/useBudgetQuery'
import { useFixedExpensesQuery } from './queries/useFixedExpensesQuery'
import { useConsumablesQuery } from './queries/useConsumablesQuery'
import { useTransactionsQuery } from './queries/useTransactionsQuery'
import { MEAL_TYPES } from '../constants'
import { useStoreTypes } from './useStoreTypes'
import { EMPTY_BUDGET_SETTINGS } from '../lib/services/budgetService'
import { useSummaryCalculations } from './useSummaryCalculations'

export type Period = 'monthly' | 'yearly' | 'all'

export function useAnalyticsData({
  userId,
  month,
  period,
}: {
  userId: string
  month: string
  period: Period
}) {
  const year = month.slice(0, 4)

  const { items: storeTypes } = useStoreTypes()

  const { data: allTransactions = [] } = useQuery({
    queryKey: ['transactions', userId, 'all'],
    queryFn: async () => {
      const { data } = await supabase
        .from('transactions')
        .select('date, type, amount, category, store_type, payment_type')
        .eq('user_id', userId)
      return data ?? []
    },
    enabled: !!userId,
  })

  const { data: profile, isError: profileError } = useProfileQuery(userId)
  const householdMembers = profile?.household_members ?? 1

  const { data: transactions = [], isError: txError } = useTransactionsQuery(userId, month)
  const { data: yearTransactions = [], isError: yearTxError } = useQuery({
    queryKey: ['transactions', userId, year, 'yearly'],
    queryFn: () => transactionService.fetchByYear(userId, year),
    enabled: !!userId,
  })
  const { data: fixedExpenses = [], isError: fixedError } = useFixedExpensesQuery(userId)
  const { data: consumables = [], isError: consumablesError } = useConsumablesQuery(userId)
  const { data: budget = EMPTY_BUDGET_SETTINGS, isError: budgetError } = useBudgetQuery(
    userId,
    month
  )

  const fetchError =
    profileError || txError || yearTxError || fixedError || consumablesError || budgetError
      ? 'データの読み込みに失敗しました'
      : null

  const FOOD_MEAL_COLS = MEAL_TYPES.map((m) => m.name)

  const periodSource =
    period === 'monthly' ? transactions : period === 'yearly' ? yearTransactions : allTransactions

  const dailyExpenses = useMemo(() => {
    const [y, m] = month.split('-').map(Number)
    const daysInMonth = new Date(y, m, 0).getDate()
    const map = new Map<number, number>()
    for (const t of transactions) {
      if (t.type !== 'expense') continue
      const day = parseInt(t.date.slice(8))
      map.set(day, (map.get(day) ?? 0) + t.amount)
    }
    return Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      amount: map.get(i + 1) ?? 0,
    }))
  }, [transactions, month])

  const periodStats = useMemo(
    () => ({
      recordDays: new Set(periodSource.map((t) => t.date)).size,
      recordCount: periodSource.length,
    }),
    [periodSource]
  )

  const storeCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of periodSource) {
      const key = t.store_type ?? '未記録'
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return [...map.entries()].sort(([, a], [, b]) => b - a)
  }, [periodSource])

  const storeAmounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of periodSource) {
      if (t.type !== 'expense') continue
      const key = t.store_type ?? '未記録'
      map.set(key, (map.get(key) ?? 0) + t.amount)
    }
    return [...map.entries()].sort(([, a], [, b]) => b - a)
  }, [periodSource])

  const paymentCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of periodSource) {
      const key = t.payment_type ?? '未記録'
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return [...map.entries()].sort(([, a], [, b]) => b - a)
  }, [periodSource])

  const paymentAmounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of periodSource) {
      if (t.type !== 'expense') continue
      const key = t.payment_type ?? '未記録'
      map.set(key, (map.get(key) ?? 0) + t.amount)
    }
    return [...map.entries()].sort(([, a], [, b]) => b - a)
  }, [periodSource])

  const monthlyExpenses = useMemo(() => {
    const map = new Map<number, number>()
    for (const t of yearTransactions) {
      if (t.type !== 'expense') continue
      const m = parseInt(t.date.slice(5, 7))
      map.set(m, (map.get(m) ?? 0) + t.amount)
    }
    return Array.from({ length: 12 }, (_, i) => ({ month: i + 1, amount: map.get(i + 1) ?? 0 }))
  }, [yearTransactions])

  const yearByCat = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of yearTransactions) {
      if (t.type !== 'expense') continue
      map.set(t.category, (map.get(t.category) ?? 0) + t.amount)
    }
    return [...map.entries()].sort(([, a], [, b]) => b - a)
  }, [yearTransactions])

  const yearExpenseTotal = useMemo(
    () => yearTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    [yearTransactions]
  )

  const allByCat = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of allTransactions) {
      if (t.type !== 'expense') continue
      map.set(t.category, (map.get(t.category) ?? 0) + t.amount)
    }
    return [...map.entries()].sort(([, a], [, b]) => b - a)
  }, [allTransactions])

  const allExpenseTotal = useMemo(
    () => allTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    [allTransactions]
  )

  const yearlyExpenses = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of allTransactions) {
      if (t.type !== 'expense') continue
      const y = t.date.slice(0, 4)
      map.set(y, (map.get(y) ?? 0) + t.amount)
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([y, amount]) => ({ year: y, amount }))
  }, [allTransactions])

  const dailyFoodByMeal = useMemo(() => {
    const [y, m] = month.split('-').map(Number)
    const days = new Date(y, m, 0).getDate()
    const map = new Map<number, Map<string, number>>()
    for (let d = 1; d <= days; d++) map.set(d, new Map())
    for (const t of transactions) {
      if (t.type !== 'expense' || t.category !== '食費') continue
      const day = parseInt(t.date.slice(8))
      const meal = FOOD_MEAL_COLS.includes(t.meal_type ?? '') ? (t.meal_type as string) : 'その他'
      const dm = map.get(day)!
      dm.set(meal, (dm.get(meal) ?? 0) + t.amount)
    }
    return { map, days }
  }, [transactions, month, FOOD_MEAL_COLS])

  const yearlyFoodByMeal = useMemo(() => {
    const map = new Map<number, Map<string, number>>()
    for (let m = 1; m <= 12; m++) map.set(m, new Map())
    for (const t of yearTransactions) {
      if (t.type !== 'expense' || t.category !== '食費') continue
      const m = parseInt(t.date.slice(5, 7))
      const meal = FOOD_MEAL_COLS.includes(t.meal_type ?? '') ? (t.meal_type as string) : 'その他'
      const mm = map.get(m)!
      mm.set(meal, (mm.get(meal) ?? 0) + t.amount)
    }
    return map
  }, [yearTransactions, FOOD_MEAL_COLS])

  const { oneTimeExpense, totalFixed, totalSaved, oneTimeByCat, fixedByCat, hasBreakdown } =
    useSummaryCalculations({
      transactions,
      fixedExpenses,
      consumables,
      householdMembers,
      budget,
      month,
    })

  return {
    fetchError,
    storeTypes,
    FOOD_MEAL_COLS,
    dailyExpenses,
    periodStats,
    storeCounts,
    storeAmounts,
    paymentCounts,
    paymentAmounts,
    monthlyExpenses,
    yearByCat,
    yearExpenseTotal,
    allByCat,
    allExpenseTotal,
    yearlyExpenses,
    dailyFoodByMeal,
    yearlyFoodByMeal,
    oneTimeExpense,
    totalFixed,
    totalSaved,
    oneTimeByCat,
    fixedByCat,
    hasBreakdown,
  }
}
