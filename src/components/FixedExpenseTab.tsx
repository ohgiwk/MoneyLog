import { useQueryClient } from '@tanstack/react-query'
import type { CategoryInfo } from '../constants'
import { useFixedExpensesQuery } from '../hooks/queries/useFixedExpensesQuery'
import { useBudgetQuery } from '../hooks/queries/useBudgetQuery'
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
  const queryClient = useQueryClient()
  const calendarMonth = todayStr().slice(0, 7)

  const { data: fixedExpenses = [], isError: fixedError, isFetching } = useFixedExpensesQuery(userId)
  const { data: budget, isError: budgetError } = useBudgetQuery(userId, calendarMonth)
  const fixedBudget = budget?.fixed ?? 0
  const loading = isFetching && fixedExpenses.length === 0
  const fetchError = fixedError || budgetError ? 'データの読み込みに失敗しました' : null

  function reload() {
    void queryClient.invalidateQueries({ queryKey: ['fixedExpenses', userId] })
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
