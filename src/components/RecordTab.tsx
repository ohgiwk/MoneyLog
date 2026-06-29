import { useEffect, useState } from 'react'
import type { CategoryInfo } from '../constants'
import { fixedExpenseService } from '../lib/services/fixedExpenseService'
import { consumableService } from '../lib/services/consumableService'
import { profileService } from '../lib/services/profileService'
import { transactionService } from '../lib/services/transactionService'
import type { Consumable, FixedExpense, Transaction } from '../lib/database.types'
import { TabGroup } from './ui/TabGroup'
import FixedExpenseList from './FixedExpenseList'
import ConsumablesList from './ConsumablesList'
import OneTimeTransactionList from './OneTimeTransactionList'
import OneTimeTransactionForm from './OneTimeTransactionForm'

type RecordSubPage = 'one_time' | 'fixed' | 'consumables'
type OneTimeView = 'list' | 'form'

const SUB_PAGE_TABS: { key: RecordSubPage; label: string }[] = [
  { key: 'one_time', label: '臨時出費' },
  { key: 'fixed', label: '固定費' },
  { key: 'consumables', label: '定期購入' },
]

interface Props {
  userId: string
  month: string
  setMonth: (m: string) => void
  expenseCategories: CategoryInfo[]
  incomeCategories: CategoryInfo[]
  fixedCategories: CategoryInfo[]
  editingTx?: Transaction | null
  onEditDone?: () => void
}

export default function RecordTab({
  userId,
  month,
  setMonth,
  expenseCategories,
  incomeCategories,
  fixedCategories,
  editingTx,
  onEditDone,
}: Props) {
  const [sub, setSub] = useState<RecordSubPage>('one_time')
  const [oneTimeView, setOneTimeView] = useState<OneTimeView>('list')
  const [formEditingTx, setFormEditingTx] = useState<Transaction | null>(null)
  const [fixedEditing, setFixedEditing] = useState(false)
  const [consumableEditing, setConsumableEditing] = useState(false)
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([])
  const [consumables, setConsumables] = useState<Consumable[]>([])
  const [householdMembers, setHouseholdMembers] = useState(1)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [availableMonths, setAvailableMonths] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

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
        const [fixed, consumablesData, profile, months, txs] = await Promise.all([
          fixedExpenseService.fetchByUser(userId),
          consumableService.fetchByUser(userId),
          profileService.fetchById(userId),
          transactionService.fetchAvailableMonths(userId),
          transactionService.fetchByMonth(userId, month),
        ])
        setFixedExpenses(fixed)
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

  const isEditing = fixedEditing || consumableEditing
  const showTabs = !isEditing && !(sub === 'one_time' && oneTimeView === 'form')

  // 現在月が利用可能リストに含まれない場合も表示できるよう補完
  const months = availableMonths.includes(month)
    ? availableMonths
    : [month, ...availableMonths].sort().reverse()

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

      {sub === 'fixed' && (
        <div className="p-4 space-y-4">
          <FixedExpenseList
            userId={userId}
            fixedExpenses={fixedExpenses}
            fixedCategories={fixedCategories}
            reload={fetchFixedExpenses}
            onEditingChange={setFixedEditing}
            loading={loading}
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
          />
        </div>
      )}
    </div>
  )
}
