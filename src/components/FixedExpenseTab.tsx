import { useEffect, useState } from 'react'
import type { CategoryInfo } from '../constants'
import { fixedExpenseService } from '../lib/services/fixedExpenseService'
import { budgetService } from '../lib/services/budgetService'
import type { FixedExpense } from '../lib/database.types'
import { todayStr } from '../utils'
import FixedExpenseList from './FixedExpenseList'

interface Props {
  userId: string
  fixedCategories: CategoryInfo[]
  fromOnboarding?: boolean
  onWizardOpen?: () => void
  onNavigate?: () => void
  onHeaderChange?: (
    state: {
      title: string
      onBack: () => void
      action?: { label: string; onClick: () => void; disabled?: boolean; tone?: 'default' | 'danger' }
    } | null
  ) => void
}

export default function FixedExpenseTab({ userId, fixedCategories, fromOnboarding, onWizardOpen, onNavigate, onHeaderChange }: Props) {
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([])
  const [fixedBudget, setFixedBudget] = useState(0)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setFetchError(null)
      try {
        const [data, budget] = await Promise.all([
          fixedExpenseService.fetchByUser(userId),
          budgetService.fetchByMonth(userId, todayStr().slice(0, 7)),
        ])
        setFixedExpenses(data)
        setFixedBudget(budget.fixed)
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : 'データの読み込みに失敗しました')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [userId])

  async function reload() {
    try {
      const data = await fixedExpenseService.fetchByUser(userId)
      setFixedExpenses(data)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'データの読み込みに失敗しました')
    }
  }

  return (
    <div className="p-4 space-y-4">
      {fetchError && (
        <div className="bg-danger-50 border border-danger-200 rounded-xl px-4 py-3 text-sm text-danger-600">
          {fetchError}
        </div>
      )}
      <FixedExpenseList
        userId={userId}
        fixedExpenses={fixedExpenses}
        fixedBudget={fixedBudget}
        fixedCategories={fixedCategories}
        reload={reload}
        onEditingChange={(state) => { onNavigate?.(); onHeaderChange?.(state) }}
        loading={loading}
        fromOnboarding={fromOnboarding}
        onWizardOpen={onWizardOpen}
      />
    </div>
  )
}
