import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAppContext } from '../contexts/AppContext'
import { useFixedExpensesQuery } from '../hooks/queries/useFixedExpensesQuery'
import { useBudgetQuery } from '../hooks/queries/useBudgetQuery'
import { useConsumablesQuery } from '../hooks/queries/useConsumablesQuery'
import { useProfileQuery } from '../hooks/queries/useProfileQuery'
import { todayStr } from '../utils'
import FixedExpenseList from './FixedExpenseList'
import ConsumablesList from './ConsumablesList'
import { TabGroup } from './ui/TabGroup'
import type { HeaderState } from '../types/layout'

type SubPage = 'fixed' | 'consumables'

const SUB_TABS: { key: SubPage; label: string }[] = [
  { key: 'fixed', label: '固定費' },
  { key: 'consumables', label: '定期購入' },
]

interface Props {
  userId: string
}

export default function FixedExpenseTab({ userId }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const { setHeaderBack: onHeaderChange, categories } = useAppContext()
  const fixedCategories = categories.activeFixedCategories
  const expenseCategories = categories.activeExpenseCategories
  const fromOnboarding =
    (location.state as { fromOnboarding?: boolean } | null)?.fromOnboarding ?? false

  useEffect(() => {
    if (fromOnboarding) {
      navigate('/fixed', { replace: true, state: {} })
    }
  }, [fromOnboarding, navigate])

  const queryClient = useQueryClient()
  const calendarMonth = todayStr().slice(0, 7)

  const [sub, setSub] = useState<SubPage>('fixed')
  const [consumableEditing, setConsumableEditing] = useState(false)

  const {
    data: fixedExpenses = [],
    isError: fixedError,
    isFetching: fixedFetching,
  } = useFixedExpensesQuery(userId)
  const { data: budget, isError: budgetError } = useBudgetQuery(userId, calendarMonth)
  const fixedBudget = budget?.fixed ?? 0
  const loading = fixedFetching && fixedExpenses.length === 0
  const fetchError = fixedError || budgetError ? 'データの読み込みに失敗しました' : null

  const { data: profile, isError: profileError } = useProfileQuery(userId)
  const householdMembers = profile?.household_members ?? 1
  const {
    data: consumables = [],
    isError: consumablesError,
    isFetching: consumablesFetching,
  } = useConsumablesQuery(userId)
  const consumablesLoading = consumablesFetching && consumables.length === 0
  const consumablesFetchError =
    profileError || consumablesError ? 'データの読み込みに失敗しました' : null

  function reload() {
    void queryClient.invalidateQueries({ queryKey: ['fixedExpenses', userId] })
  }

  function reloadConsumables() {
    void queryClient.invalidateQueries({ queryKey: ['consumables', userId] })
  }

  function handleConsumableEditingChange(state: HeaderState | null) {
    setConsumableEditing(state !== null)
    onHeaderChange(state)
  }

  const showTabs = !consumableEditing

  return (
    <div>
      {showTabs && (
        <div className="sticky top-0 z-10 bg-surface-subtle px-4 pt-4 pb-2">
          <TabGroup tabs={SUB_TABS} active={sub} onChange={(key) => setSub(key)} size="sm" />
        </div>
      )}

      {sub === 'fixed' && (
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
      )}

      {sub === 'consumables' && (
        <div className="p-4 space-y-4">
          {consumablesFetchError && (
            <div className="bg-danger-50 border border-danger-200 rounded-xl px-4 py-3 text-sm text-danger-600">
              {consumablesFetchError}
            </div>
          )}
          <ConsumablesList
            userId={userId}
            consumables={consumables}
            householdMembers={householdMembers}
            expenseCategories={expenseCategories}
            reload={reloadConsumables}
            onEditingChange={handleConsumableEditingChange}
            loading={consumablesLoading}
            onTransactionAdded={reloadConsumables}
          />
        </div>
      )}
    </div>
  )
}
