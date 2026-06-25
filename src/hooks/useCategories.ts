import { useState, useCallback } from 'react'
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  FIXED_EXPENSE_CATEGORIES,
  type CategoryInfo,
} from '../constants'

const STORAGE_KEYS = {
  expense: 'moneylog_expense_categories',
  income: 'moneylog_income_categories',
  fixed: 'moneylog_fixed_categories',
} as const

function load(key: string, fallback: CategoryInfo[]): CategoryInfo[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as CategoryInfo[]) : fallback
  } catch {
    return fallback
  }
}

function save(key: string, categories: CategoryInfo[]) {
  localStorage.setItem(key, JSON.stringify(categories))
}

export function useCategories() {
  const [expenseCategories, setExpenseCategories] = useState<CategoryInfo[]>(() =>
    load(STORAGE_KEYS.expense, EXPENSE_CATEGORIES)
  )
  const [incomeCategories, setIncomeCategories] = useState<CategoryInfo[]>(() =>
    load(STORAGE_KEYS.income, INCOME_CATEGORIES)
  )
  const [fixedCategories, setFixedCategories] = useState<CategoryInfo[]>(() =>
    load(STORAGE_KEYS.fixed, FIXED_EXPENSE_CATEGORIES)
  )

  const updateExpenseCategories = useCallback((cats: CategoryInfo[]) => {
    save(STORAGE_KEYS.expense, cats)
    setExpenseCategories(cats)
  }, [])

  const updateIncomeCategories = useCallback((cats: CategoryInfo[]) => {
    save(STORAGE_KEYS.income, cats)
    setIncomeCategories(cats)
  }, [])

  const updateFixedCategories = useCallback((cats: CategoryInfo[]) => {
    save(STORAGE_KEYS.fixed, cats)
    setFixedCategories(cats)
  }, [])

  return {
    expenseCategories,
    incomeCategories,
    fixedCategories,
    updateExpenseCategories,
    updateIncomeCategories,
    updateFixedCategories,
  }
}
