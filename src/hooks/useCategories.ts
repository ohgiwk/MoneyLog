import { useState, useCallback, useEffect } from 'react'
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  FIXED_EXPENSE_CATEGORIES,
  type CategoryInfo,
} from '../constants'
import { categoryService } from '../lib/services/categoryService'

const STORAGE_KEYS = {
  expense: 'moneylog_expense_categories',
  income: 'moneylog_income_categories',
  fixed: 'moneylog_fixed_categories',
} as const

function loadLocal(key: string, fallback: CategoryInfo[]): CategoryInfo[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as CategoryInfo[]) : fallback
  } catch {
    return fallback
  }
}

function saveLocal(key: string, categories: CategoryInfo[]) {
  localStorage.setItem(key, JSON.stringify(categories))
}

export function useCategories(userId?: string | null) {
  const [expenseCategories, setExpenseCategories] = useState<CategoryInfo[]>(() =>
    loadLocal(STORAGE_KEYS.expense, EXPENSE_CATEGORIES)
  )
  const [incomeCategories, setIncomeCategories] = useState<CategoryInfo[]>(() =>
    loadLocal(STORAGE_KEYS.income, INCOME_CATEGORIES)
  )
  const [fixedCategories, setFixedCategories] = useState<CategoryInfo[]>(() =>
    loadLocal(STORAGE_KEYS.fixed, FIXED_EXPENSE_CATEGORIES)
  )

  useEffect(() => {
    if (!userId) return
    categoryService.fetchAll(userId).then((remote) => {
      if (remote.expense) {
        saveLocal(STORAGE_KEYS.expense, remote.expense)
        setExpenseCategories(remote.expense)
      }
      if (remote.income) {
        saveLocal(STORAGE_KEYS.income, remote.income)
        setIncomeCategories(remote.income)
      }
      if (remote.fixed) {
        saveLocal(STORAGE_KEYS.fixed, remote.fixed)
        setFixedCategories(remote.fixed)
      }
    })
  }, [userId])

  const updateExpenseCategories = useCallback(
    (cats: CategoryInfo[]) => {
      saveLocal(STORAGE_KEYS.expense, cats)
      setExpenseCategories(cats)
      if (userId) categoryService.save(userId, 'expense', cats)
    },
    [userId]
  )

  const updateIncomeCategories = useCallback(
    (cats: CategoryInfo[]) => {
      saveLocal(STORAGE_KEYS.income, cats)
      setIncomeCategories(cats)
      if (userId) categoryService.save(userId, 'income', cats)
    },
    [userId]
  )

  const updateFixedCategories = useCallback(
    (cats: CategoryInfo[]) => {
      saveLocal(STORAGE_KEYS.fixed, cats)
      setFixedCategories(cats)
      if (userId) categoryService.save(userId, 'fixed', cats)
    },
    [userId]
  )

  return {
    expenseCategories,
    incomeCategories,
    fixedCategories,
    activeExpenseCategories: expenseCategories.filter((c) => c.enabled !== false),
    activeIncomeCategories: incomeCategories.filter((c) => c.enabled !== false),
    activeFixedCategories: fixedCategories.filter((c) => c.enabled !== false),
    updateExpenseCategories,
    updateIncomeCategories,
    updateFixedCategories,
  }
}
