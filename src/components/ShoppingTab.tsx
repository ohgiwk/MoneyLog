import { useState } from 'react'
import { useAppContext } from '../contexts/AppContext'
import { useQueryClient } from '@tanstack/react-query'
import { TabGroup } from './ui/TabGroup'
import ShoppingMemo from './ShoppingMemo'
import WishlistPanel from './WishlistPanel'

type SubPage = 'shopping' | 'wishlist'

const SUB_TABS: { key: SubPage; label: string }[] = [
  { key: 'wishlist', label: '目標' },
  { key: 'shopping', label: '買い物メモ' },
]

interface Props {
  userId: string
}

export default function ShoppingTab({ userId }: Props) {
  const { shoppingTapKey: resetSignal, categories } = useAppContext()
  const expenseCategories = categories.activeExpenseCategories
  const queryClient = useQueryClient()
  const [sub, setSub] = useState<SubPage>('wishlist')

  // 下部タブの「目標」を再タップしたら目標サブタブに戻す
  const [prevSignal, setPrevSignal] = useState(resetSignal)
  if (resetSignal !== prevSignal) {
    setPrevSignal(resetSignal)
    setSub('wishlist')
  }

  function fetchTransactions() {
    void queryClient.invalidateQueries({ queryKey: ['consumables', userId] })
  }

  return (
    <div>
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
