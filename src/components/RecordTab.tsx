import { useEffect, useState } from 'react'
import type { CategoryInfo } from '../constants'
import { fixedExpenseService } from '../lib/services/fixedExpenseService'
import { consumableService } from '../lib/services/consumableService'
import { profileService } from '../lib/services/profileService'
import type { Consumable, FixedExpense, Transaction } from '../lib/database.types'
import { TabGroup } from './ui/TabGroup'
import FixedExpenseList from './FixedExpenseList'
import ConsumablesList from './ConsumablesList'
import OneTimeTransactionForm from './OneTimeTransactionForm'

type RecordSubPage = 'one_time' | 'fixed' | 'consumables'

const SUB_PAGE_TABS: { key: RecordSubPage; label: string }[] = [
  { key: 'one_time', label: '臨時出費' },
  { key: 'fixed', label: '固定費' },
  { key: 'consumables', label: '消耗品費' },
]

interface Props {
  userId: string
  expenseCategories: CategoryInfo[]
  incomeCategories: CategoryInfo[]
  fixedCategories: CategoryInfo[]
  editingTx?: Transaction | null
  onEditDone?: () => void
  onEditSaved?: () => void
  onEditTx?: (tx: Transaction) => void
  onDetail?: () => void
}

export default function RecordTab({
  userId,
  expenseCategories,
  incomeCategories,
  fixedCategories,
  editingTx,
  onEditDone,
  onEditSaved,
  onEditTx,
  onDetail,
}: Props) {
  const [sub, setSub] = useState<RecordSubPage>('one_time')
  const [fixedEditing, setFixedEditing] = useState(false)
  const [consumableEditing, setConsumableEditing] = useState(false)
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([])
  const [consumables, setConsumables] = useState<Consumable[]>([])
  const [householdMembers, setHouseholdMembers] = useState(1)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    if (editingTx) setSub('one_time')
  }, [editingTx])

  useEffect(() => {
    const load = async () => {
      setFetchError(null)
      try {
        const [fixed, consumablesData, profile] = await Promise.all([
          fixedExpenseService.fetchByUser(userId),
          consumableService.fetchByUser(userId),
          profileService.fetchById(userId),
        ])
        setFixedExpenses(fixed)
        setConsumables(consumablesData)
        if (profile) setHouseholdMembers(profile.household_members ?? 1)
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : 'データの読み込みに失敗しました')
      }
    }
    void load()
  }, [userId])

  async function fetchFixedExpenses() {
    try {
      const data = await fixedExpenseService.fetchByUser(userId)
      setFixedExpenses(data)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'データの読み込みに失敗しました')
    }
  }

  async function fetchConsumables() {
    try {
      const data = await consumableService.fetchByUser(userId)
      setConsumables(data)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'データの読み込みに失敗しました')
    }
  }

  const isEditing = fixedEditing || consumableEditing

  return (
    <div>
      {!isEditing && (
        <div className="px-4 pt-4">
          <TabGroup tabs={SUB_PAGE_TABS} active={sub} onChange={setSub} size="sm" />
        </div>
      )}

      {fetchError && (
        <div className="mx-4 mt-3 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-600">
          {fetchError}
        </div>
      )}

      <div className="p-4 space-y-4">
        {sub === 'one_time' && (
          <OneTimeTransactionForm
            userId={userId}
            expenseCategories={expenseCategories}
            incomeCategories={incomeCategories}
            editingTx={editingTx}
            onEditDone={onEditDone}
            onEditSaved={onEditSaved}
            onEditTx={onEditTx}
            onDetail={onDetail}
          />
        )}

        {sub === 'fixed' && (
          <FixedExpenseList
            userId={userId}
            fixedExpenses={fixedExpenses}
            fixedCategories={fixedCategories}
            reload={fetchFixedExpenses}
            onEditingChange={setFixedEditing}
          />
        )}

        {sub === 'consumables' && (
          <ConsumablesList
            userId={userId}
            consumables={consumables}
            householdMembers={householdMembers}
            reload={fetchConsumables}
            onEditingChange={setConsumableEditing}
          />
        )}
      </div>
    </div>
  )
}
