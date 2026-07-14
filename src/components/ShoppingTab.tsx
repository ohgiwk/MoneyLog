import { useEffect, useState } from 'react'
import type { CategoryInfo } from '../constants'
import type { Consumable } from '../lib/database.types'
import { consumableService } from '../lib/services/consumableService'
import { profileService } from '../lib/services/profileService'
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
  month: string
  expenseCategories: CategoryInfo[]
  resetSignal?: number
  onNavigate?: () => void
  onHeaderChange?: (
    state: {
      title: string
      onBack: () => void
      action?: { label: string; onClick: () => void; disabled?: boolean; tone?: 'default' | 'danger' }
    } | null
  ) => void
}

export default function ShoppingTab({ userId, expenseCategories, resetSignal, onNavigate, onHeaderChange }: Props) {
  const [sub, setSub] = useState<SubPage>('shopping')
  const [consumables, setConsumables] = useState<Consumable[]>([])
  const [householdMembers, setHouseholdMembers] = useState(1)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [consumableEditing, setConsumableEditing] = useState(false)

  // 下部タブの「買い物メモ」を再タップしたら定期購入に戻す
  const [prevSignal, setPrevSignal] = useState(resetSignal)
  if (resetSignal !== prevSignal) {
    setPrevSignal(resetSignal)
    setSub('shopping')
  }

  useEffect(() => {
    const load = async () => {
      setFetchError(null)
      setLoading(true)
      try {
        const [profile, consumablesData] = await Promise.all([
          profileService.fetchById(userId),
          consumableService.fetchByUser(userId),
        ])
        if (profile) setHouseholdMembers(profile.household_members ?? 1)
        setConsumables(consumablesData)
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : 'データの読み込みに失敗しました')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

async function fetchConsumables() {
    try {
      const data = await consumableService.fetchByUser(userId)
      setConsumables(data)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'データの読み込みに失敗しました')
    }
  }

  async function fetchTransactions() {
    // ShoppingMemoからの出費追加後に定期購入リストを再取得
    await fetchConsumables()
  }

  function handleConsumableEditingChange(
    state: {
      title: string
      onBack: () => void
      action?: { label: string; onClick: () => void; disabled?: boolean; tone?: 'default' | 'danger' }
    } | null
  ) {
    onNavigate?.()
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
            onChange={(key) => { onNavigate?.(); setSub(key) }}
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

      {sub === 'wishlist' && (
        <WishlistPanel userId={userId} />
      )}
    </div>
  )
}
