import { useEffect, useRef, useState } from 'react'
import type { CategoryInfo } from '../constants'
import { consumableService } from '../lib/services/consumableService'
import { profileService } from '../lib/services/profileService'
import { transactionService } from '../lib/services/transactionService'
import type { Consumable, Transaction } from '../lib/database.types'
import { periodKey, todayStr } from '../utils'
import { TabGroup } from './ui/TabGroup'
import ConsumablesList from './ConsumablesList'
import OneTimeTransactionList from './OneTimeTransactionList'
import OneTimeTransactionForm from './OneTimeTransactionForm'
import ShoppingMemo from './ShoppingMemo'
import PageTransition, { type NavDirection } from './PageTransition'

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

export default function RecordTab({
  userId,
  month,
  setMonth,
  expenseCategories,
  incomeCategories,
  editingTx,
  onEditDone,
  initialSub,
  resetSignal,
  onNavigate,
  onHeaderChange,
}: Props) {
  const [sub, setSubRaw] = useState<RecordSubPage>(initialSub ?? 'one_time')
  const setSub = (next: RecordSubPage) => {
    onNavigate?.()
    setSubRaw(next)
  }
  const [oneTimeView, setOneTimeView] = useState<OneTimeView>('list')
  const [oneTimeDirection, setOneTimeDirection] = useState<NavDirection>('forward')
  const [formEditingTx, setFormEditingTx] = useState<Transaction | null>(null)
  const [consumableEditing, setConsumableEditing] = useState(false)
  const [consumables, setConsumables] = useState<Consumable[]>([])
  const [householdMembers, setHouseholdMembers] = useState(1)
  const [monthStartDay, setMonthStartDay] = useState(1)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [availableMonths, setAvailableMonths] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const periodInitialized = useRef(false)

  // initialSub が指定されたときにサブページを切り替える
  useEffect(() => {
    if (initialSub) setSub(initialSub)
  }, [initialSub])

  // 下部タブの「記録」を再タップしたら出費一覧に戻す
  const resetSignalMounted = useRef(false)
  useEffect(() => {
    if (!resetSignalMounted.current) {
      resetSignalMounted.current = true
      return
    }
    setSub('one_time')
    setOneTimeDirection('back')
    setOneTimeView('list')
  }, [resetSignal])

  // 外部からの編集リクエスト（サマリー画面など）
  useEffect(() => {
    if (editingTx) {
      setSub('one_time')
      setFormEditingTx(editingTx)
      setOneTimeDirection('forward')
      setOneTimeView('form')
    }
  }, [editingTx])

  // マウント時に全データを並列取得
  useEffect(() => {
    const load = async () => {
      setFetchError(null)
      setLoading(true)
      try {
        const profile = await profileService.fetchById(userId)
        const startDay = profile?.month_start_day ?? 1
        setMonthStartDay(startDay)
        if (profile) setHouseholdMembers(profile.household_members ?? 1)

        // 月開始日の設定に応じて、現在いるべき集計期間に補正する（初回のみ）
        let effectiveMonth = month
        if (!periodInitialized.current) {
          periodInitialized.current = true
          const correctPeriod = periodKey(todayStr(), startDay)
          if (correctPeriod !== month) {
            effectiveMonth = correctPeriod
            setMonth(correctPeriod)
          }
        }

        const [consumablesData, months, txs] = await Promise.all([
          consumableService.fetchByUser(userId),
          transactionService.fetchAvailableMonths(userId, startDay),
          transactionService.fetchByMonth(userId, effectiveMonth, startDay),
        ])
        setConsumables(consumablesData)
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
    if (!periodInitialized.current) return
    transactionService.fetchByMonth(userId, month, monthStartDay)
      .then(setTransactions)
      .catch(() => {})
  }, [userId, month, monthStartDay])

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
        transactionService.fetchByMonth(userId, month, monthStartDay),
        transactionService.fetchAvailableMonths(userId, monthStartDay),
      ])
      setTransactions(txs)
      setAvailableMonths(months)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'データの読み込みに失敗しました')
    }
  }

  function openForm(tx?: Transaction) {
    onNavigate?.()
    setFormEditingTx(tx ?? null)
    setOneTimeDirection('forward')
    setOneTimeView('form')
  }

  function backToList() {
    onNavigate?.()
    setFormEditingTx(null)
    setOneTimeDirection('back')
    setOneTimeView('list')
    onEditDone?.()
    void fetchTransactions()
  }

  // 出費フォーム表示中のヘッダーは OneTimeTransactionForm 自身が管理する。
  // それ以外のビューに切り替わったらヘッダーをクリアする
  useEffect(() => {
    if (!(sub === 'one_time' && oneTimeView === 'form')) {
      onHeaderChange?.(null)
    }
  }, [sub, oneTimeView]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const isEditing = consumableEditing
  const showTabs = !isEditing && !(sub === 'one_time' && oneTimeView === 'form')

  // 記録がある期間 + 現在の集計期間（記録なしでも）を含むリストを構築
  const currentPeriod = periodKey(todayStr(), monthStartDay)
  const monthSet = new Set([currentPeriod, ...availableMonths])
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

      {sub === 'one_time' && (
        <PageTransition pageKey={oneTimeView} direction={oneTimeDirection}>
          {oneTimeView === 'list' ? (
            <OneTimeTransactionList
              transactions={transactions}
              month={month}
              setMonth={setMonth}
              availableMonths={months}
              loading={loading}
              onAdd={() => openForm()}
              onEditTx={(tx) => openForm(tx)}
              startDay={monthStartDay}
            />
          ) : (
            <div className="p-4 pb-28">
              <OneTimeTransactionForm
                userId={userId}
                expenseCategories={expenseCategories}
                incomeCategories={incomeCategories}
                editingTx={formEditingTx}
                onBack={backToList}
                onHeaderChange={onHeaderChange}
              />
            </div>
          )}
        </PageTransition>
      )}

      {sub === 'consumables' && (
        <div className="p-4 space-y-4">
          <ConsumablesList
            userId={userId}
            consumables={consumables}
            householdMembers={householdMembers}
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
    </div>
  )
}
