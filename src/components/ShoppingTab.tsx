import { useState } from 'react'
import { useAppContext } from '../contexts/AppContext'
import { useProfileQuery } from '../hooks/queries/useProfileQuery'
import { useConsumablesQuery } from '../hooks/queries/useConsumablesQuery'
import { useQueryClient } from '@tanstack/react-query'
import { TabGroup } from './ui/TabGroup'
import ConsumablesList from './ConsumablesList'
import ShoppingMemo from './ShoppingMemo'
import WishlistPanel from './WishlistPanel'

type SubPage = 'consumables' | 'shopping' | 'wishlist'

const SUB_TABS: { key: SubPage; label: string }[] = [
  { key: 'shopping', label: '買い物メモ' },
  { key: 'consumables', label: '定期購入' },
  { key: 'wishlist', label: '目標' },
]

interface Props {
  userId: string
}

export default function ShoppingTab({ userId }: Props) {
  const { shoppingTapKey: resetSignal, setHeaderBack: onHeaderChange, categories } = useAppContext()
  const expenseCategories = categories.expenseCategories
  const queryClient = useQueryClient()
  const [sub, setSub] = useState<SubPage>('shopping')
  const [consumableEditing, setConsumableEditing] = useState(false)

  // 下部タブの「買い物メモ」を再タップしたら定期購入に戻す
  const [prevSignal, setPrevSignal] = useState(resetSignal)
  if (resetSignal !== prevSignal) {
    setPrevSignal(resetSignal)
    setSub('shopping')
  }

  const { data: profile, isError: profileError } = useProfileQuery(userId)
  const householdMembers = profile?.household_members ?? 1
  const {
    data: consumables = [],
    isError: consumablesError,
    isFetching,
  } = useConsumablesQuery(userId)
  const loading = isFetching && consumables.length === 0
  const fetchError = profileError || consumablesError ? 'データの読み込みに失敗しました' : null

  function fetchConsumables() {
    void queryClient.invalidateQueries({ queryKey: ['consumables', userId] })
  }

  function fetchTransactions() {
    fetchConsumables()
  }

  function handleConsumableEditingChange(
    state: {
      title: string
      onBack: () => void
      action?: {
        label: string
        onClick: () => void
        disabled?: boolean
        tone?: 'default' | 'danger'
      }
    } | null
  ) {
    setConsumableEditing(state !== null)
    onHeaderChange?.(state)
  }

  const showTabs = !consumableEditing

  return (
    <div>
      {showTabs && (
        <div className="sticky top-0 z-10 bg-surface-subtle px-4 pt-4 pb-2">
          <TabGroup
            tabs={SUB_TABS}
            active={sub}
            onChange={(key) => {
              setSub(key)
            }}
            size="sm"
          />
        </div>
      )}

      {fetchError && (
        <div className="mx-4 mt-3 bg-danger-50 border border-danger-200 rounded-xl px-4 py-3 text-sm text-danger-600">
          {fetchError}
        </div>
      )}

      {sub === 'consumables' && (
        <div className="p-4 space-y-4">
          <ConsumablesList
            userId={userId}
            consumables={consumables}
            householdMembers={householdMembers}
            expenseCategories={expenseCategories}
            reload={fetchConsumables}
            onEditingChange={handleConsumableEditingChange}
            loading={loading}
            onTransactionAdded={fetchTransactions}
          />
        </div>
      )}

      {sub === 'shopping' && (
        <ShoppingMemo
          userId={userId}
          expenseCategories={expenseCategories}
          onTransactionAdded={fetchTransactions}
        />
      )}

      {sub === 'wishlist' && <WishlistPanel userId={userId} />}
    </div>
  )
}
