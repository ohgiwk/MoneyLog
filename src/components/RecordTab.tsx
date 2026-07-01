import { useEffect, useState } from 'react'
import type { CategoryInfo } from '../constants'
import { consumableService } from '../lib/services/consumableService'
import { profileService } from '../lib/services/profileService'
import { transactionService } from '../lib/services/transactionService'
import type { Consumable, Transaction } from '../lib/database.types'
import { TabGroup } from './ui/TabGroup'
import ConsumablesList from './ConsumablesList'
import OneTimeTransactionList from './OneTimeTransactionList'
import OneTimeTransactionForm from './OneTimeTransactionForm'
import ShoppingMemo from './ShoppingMemo'

type RecordSubPage = 'one_time' | 'consumables' | 'shopping'
type OneTimeView = 'list' | 'form'

const SUB_PAGE_TABS: { key: RecordSubPage; label: string }[] = [
  { key: 'one_time', label: '出費' },
  { key: 'consumables', label: '定期購入' },
  { key: 'shopping', label: '買い物メモ' },
]

interface Props {
  userId: string
  month: string
  setMonth: (m: string) => void
  expenseCategories: CategoryInfo[]
  incomeCategories: CategoryInfo[]
  editingTx?: Transaction | null
  onEditDone?: () => void
  initialSub?: RecordSubPage
}

export default function RecordTab({
  userId,
  month,
  setMonth,
  expenseCategories,
  incomeCategories,
  editingTx,
  onEditDone,
  initialSub,
}: Props) {
  const [sub, setSub] = useState<RecordSubPage>(initialSub ?? 'one_time')
  const [oneTimeView, setOneTimeView] = useState<OneTimeView>('list')
  const [formEditingTx, setFormEditingTx] = useState<Transaction | null>(null)
  const [consumableEditing, setConsumableEditing] = useState(false)
  const [consumables, setConsumables] = useState<Consumable[]>([])
  const [householdMembers, setHouseholdMembers] = useState(1)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [availableMonths, setAvailableMonths] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // initialSub が指定されたときにサブページを切り替える
  useEffect(() => {
    if (initialSub) setSub(initialSub)
  }, [initialSub])

  // 外部からの編集リクエスト（サマリー画面など）
  useEffect(() => {
    if (editingTx) {
      setSub('one_time')
      setFormEditingTx(editingTx)
      setOneTimeView('form')
    }
  }, [editingTx])

  // マウント時に全データを並列取得
  useEffect(() => {
    const load = async () => {
      setFetchError(null)
      setLoading(true)
      try {
        const [consumablesData, profile, months, txs] = await Promise.all([
          consumableService.fetchByUser(userId),
          profileService.fetchById(userId),
          transactionService.fetchAvailableMonths(userId),
          transactionService.fetchByMonth(userId, month),
        ])
        setConsumables(consumablesData)
        if (profile) setHouseholdMembers(profile.household_members ?? 1)
        setAvailableMonths(months)
        setTransactions(txs)
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : 'データの読み込みに失敗しました')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  // 月が変わったらトランザクションを再取得
  useEffect(() => {
    transactionService.fetchByMonth(userId, month)
      .then(setTransactions)
      .catch(() => {})
  }, [userId, month])

  async function fetchConsumables() {
    try {
      const data = await consumableService.fetchByUser(userId)
      setConsumables(data)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'データの読み込みに失敗しました')
    }
  }

  async function fetchTransactions() {
    try {
      const [txs, months] = await Promise.all([
        transactionService.fetchByMonth(userId, month),
        transactionService.fetchAvailableMonths(userId),
      ])
      setTransactions(txs)
      setAvailableMonths(months)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'データの読み込みに失敗しました')
    }
  }

  function openForm(tx?: Transaction) {
    setFormEditingTx(tx ?? null)
    setOneTimeView('form')
  }

  function backToList() {
    setFormEditingTx(null)
    setOneTimeView('list')
    onEditDone?.()
    void fetchTransactions()
  }

  const isEditing = consumableEditing
  const showTabs = !isEditing && !(sub === 'one_time' && oneTimeView === 'form')

  // 記録がある月 + 今月（記録なしでも）を含むリストを構築
  const currentMonth = new Date().toISOString().slice(0, 7)
  const monthSet = new Set([currentMonth, ...availableMonths])
  const months = [...monthSet].sort().reverse()

  return (
    <div>
      {showTabs && (
        <div className="px-4 pt-4">
          <TabGroup tabs={SUB_PAGE_TABS} active={sub} onChange={setSub} size="sm" />
        </div>
      )}

      {fetchError && (
        <div className="mx-4 mt-3 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-600">
          {fetchError}
        </div>
      )}

      {sub === 'one_time' && oneTimeView === 'list' && (
        <OneTimeTransactionList
          transactions={transactions}
          month={month}
          setMonth={setMonth}
          availableMonths={months}
          loading={loading}
          onAdd={() => openForm()}
          onEditTx={(tx) => openForm(tx)}
        />
      )}

      {sub === 'one_time' && oneTimeView === 'form' && (
        <div className="p-4">
          <OneTimeTransactionForm
            userId={userId}
            expenseCategories={expenseCategories}
            incomeCategories={incomeCategories}
            editingTx={formEditingTx}
            onBack={backToList}
          />
        </div>
      )}

      {sub === 'consumables' && (
        <div className="p-4 space-y-4">
          <ConsumablesList
            userId={userId}
            consumables={consumables}
            householdMembers={householdMembers}
            reload={fetchConsumables}
            onEditingChange={setConsumableEditing}
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
    </div>
  )
}
