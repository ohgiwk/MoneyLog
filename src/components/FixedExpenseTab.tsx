import { useEffect, useState } from 'react'
import type { CategoryInfo } from '../constants'
import { fixedExpenseService } from '../lib/services/fixedExpenseService'
import type { FixedExpense } from '../lib/database.types'
import FixedExpenseList from './FixedExpenseList'

interface Props {
  userId: string
  fixedCategories: CategoryInfo[]
  fromOnboarding?: boolean
  onWizardOpen?: () => void
}

export default function FixedExpenseTab({ userId, fixedCategories, fromOnboarding, onWizardOpen }: Props) {
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setFetchError(null)
      try {
        const data = await fixedExpenseService.fetchByUser(userId)
        setFixedExpenses(data)
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
        <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-600">
          {fetchError}
        </div>
      )}
      <FixedExpenseList
        userId={userId}
        fixedExpenses={fixedExpenses}
        fixedCategories={fixedCategories}
        reload={reload}
        onEditingChange={() => {}}
        loading={loading}
        fromOnboarding={fromOnboarding}
        onWizardOpen={onWizardOpen}
      />
    </div>
  )
}
