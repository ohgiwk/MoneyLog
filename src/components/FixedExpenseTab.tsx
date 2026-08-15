import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAppContext } from '../contexts/AppContext'
import { useFixedExpensesQuery } from '../hooks/queries/useFixedExpensesQuery'
import { useBudgetQuery } from '../hooks/queries/useBudgetQuery'
import { todayStr } from '../utils'
import FixedExpenseList from './FixedExpenseList'

interface Props {
  userId: string
}

export default function FixedExpenseTab({ userId }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const { setHeaderBack: onHeaderChange, categories } = useAppContext()
  const fixedCategories = categories.fixedCategories
  const fromOnboarding =
    (location.state as { fromOnboarding?: boolean } | null)?.fromOnboarding ?? false

  useEffect(() => {
    if (fromOnboarding) {
      navigate('/fixed', { replace: true, state: {} })
    }
  }, [fromOnboarding, navigate])
  const queryClient = useQueryClient()
  const calendarMonth = todayStr().slice(0, 7)

  const {
    data: fixedExpenses = [],
    isError: fixedError,
    isFetching,
  } = useFixedExpensesQuery(userId)
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
        onEditingChange={(state) => {
          onHeaderChange(state)
        }}
        loading={loading}
        fromOnboarding={fromOnboarding}
        onWizardOpen={undefined}
      />
    </div>
  )
}
