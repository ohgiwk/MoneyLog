import { useEffect, useRef, useState } from 'react'
import { useAppContext } from '../contexts/AppContext'
import { transactionService } from '../lib/services/transactionService'
import { useProfileQuery } from '../hooks/queries/useProfileQuery'
import { useBudgetQuery } from '../hooks/queries/useBudgetQuery'
import { useTransactionsQuery, useTransactionDelete } from '../hooks/queries/useTransactionsQuery'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { oneTimeBudgetTotal } from '../lib/services/budgetService'
import type { Transaction } from '../lib/database.types'
import type { HeaderState } from '../types/layout'
import { periodKey, todayStr } from '../utils'
import OneTimeTransactionList from './OneTimeTransactionList'
import OneTimeTransactionForm from './OneTimeTransactionForm'
import BottomSheet from './ui/BottomSheet'

interface Props {
  userId: string
}

export default function RecordTab({ userId }: Props) {
  const {
    month,
    setMonth,
    editingTx,
    setEditingTx,
    recordTapKey: resetSignal,
    categories,
  } = useAppContext()
  const expenseCategories = categories.expenseCategories
  const incomeCategories = categories.incomeCategories
  const queryClient = useQueryClient()
  const [formEditingTx, setFormEditingTx] = useState<Transaction | null>(null)
  const [formDuplicateTx, setFormDuplicateTx] = useState<Transaction | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [formType, setFormType] = useState<'expense' | 'income'>('expense')
  const submitRef = useRef<(() => void) | null>(null)
  const [formHeaderState, setFormHeaderState] = useState<HeaderState | null>(null)
  const periodInitialized = useRef(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [rangeTransactions, setRangeTransactions] = useState<Transaction[] | null>(null)
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  const { data: profile, isError: profileError } = useProfileQuery(userId)
  const monthStartDay = profile?.month_start_day ?? 1

  const {
    data: transactions = [],
    isError: txError,
    isFetching: txLoading,
  } = useTransactionsQuery(userId, month, monthStartDay)
  const deleteMutation = useTransactionDelete(userId)
  const { data: budget, isError: budgetError } = useBudgetQuery(userId, month)
  const oneTimeBudget = budget ? oneTimeBudgetTotal(budget) : 0

  const { data: availableMonths = [], isError: availableMonthsError } = useQuery({
    queryKey: ['availableMonths', userId, monthStartDay],
    queryFn: () => transactionService.fetchAvailableMonths(userId, monthStartDay),
    enabled: !!userId,
  })

  const fetchError =
    profileError || txError || budgetError || availableMonthsError
      ? 'データの読み込みに失敗しました'
      : null

  const loading = txLoading && transactions.length === 0

  // 下部タブの「入力」を再タップしたら入力モーダルを開く
  const initialResetSignal = useRef(resetSignal)
  useEffect(() => {
    if (resetSignal === initialResetSignal.current) return
    setFormEditingTx(null)
    setModalOpen(true)
  }, [resetSignal])

  // 外部からの編集リクエスト（サマリー画面など）
  // （レンダー中に前回値と比較して即座に補正する React 推奨パターン）
  const [prevEditingTx, setPrevEditingTx] = useState(editingTx)
  if (editingTx !== prevEditingTx) {
    setPrevEditingTx(editingTx)
    if (editingTx) {
      setFormEditingTx(editingTx)
      setModalOpen(true)
    }
  }
  useEffect(() => {
    if (editingTx) {
      /* scroll reset handled by route transition */
    }
  }, [editingTx]) // eslint-disable-line react-hooks/exhaustive-deps

  // 月開始日が確定したら、現在いるべき集計期間に補正する（初回のみ）
  useEffect(() => {
    if (!profile || periodInitialized.current) return
    periodInitialized.current = true
    const correctPeriod = periodKey(todayStr(), monthStartDay)
    if (correctPeriod !== month) {
      setMonth(correctPeriod)
    }
  }, [profile]) // eslint-disable-line react-hooks/exhaustive-deps

  // 期間絞り込み（開始日・終了日）が指定されたら、月を跨いでその範囲のトランザクションを取得
  useEffect(() => {
    if (dateFrom === '' || dateTo === '') {
      setRangeTransactions(null)
      return
    }
    transactionService
      .fetchByDateRange(userId, dateFrom, dateTo)
      .then(setRangeTransactions)
      .catch(() => {})
  }, [userId, dateFrom, dateTo])

  function refreshTransactions() {
    void queryClient.invalidateQueries({ queryKey: ['transactions', userId] })
    void queryClient.invalidateQueries({ queryKey: ['availableMonths', userId] })
  }

  function openForm(tx?: Transaction) {
    setFormEditingTx(tx ?? null)
    setFormType('expense')
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setFormEditingTx(null)
    setFormDuplicateTx(null)
    setEditingTx(null)
    setFormHeaderState(null)
    refreshTransactions()
  }

  // 記録がある期間 + 現在の集計期間（記録なしでも）を含むリストを構築
  const currentPeriod = periodKey(todayStr(), monthStartDay)
  const monthSet = new Set([currentPeriod, ...availableMonths])
  const months = [...monthSet].sort().reverse()

  return (
    <div>
      {fetchError && (
        <div className="mx-4 mt-3 bg-danger-50 border border-danger-200 rounded-xl px-4 py-3 text-sm text-danger-600">
          {fetchError}
        </div>
      )}

      <OneTimeTransactionList
        transactions={rangeTransactions ?? transactions}
        month={month}
        setMonth={setMonth}
        availableMonths={months}
        loading={loading}
        onAdd={() => openForm()}
        onEditTx={(tx) => openForm(tx)}
        onDeleteTx={(id) => deleteMutation.mutate(id)}
        onDuplicateTx={(tx) => {
          setFormEditingTx(null)
          setFormDuplicateTx(tx)
          setFormType(tx.type as 'expense' | 'income')
          setModalOpen(true)
        }}
        startDay={monthStartDay}
        budget={oneTimeBudget}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
      />

      {/* 入力ボトムシート */}
      <BottomSheet
        isOpen={modalOpen}
        onClose={closeModal}
        title={
          formEditingTx
            ? formType === 'income'
              ? '収入を編集'
              : '出費を編集'
            : formDuplicateTx
              ? formType === 'income'
                ? '収入を複製'
                : '出費を複製'
              : formType === 'income'
                ? '収入を入力'
                : '出費を入力'
        }
        rightAction={
          formHeaderState?.action
            ? {
                onClick: formHeaderState.action.onClick,
                disabled: formHeaderState.action.disabled,
                tone: 'danger',
              }
            : undefined
        }
        footer={
          <button
            type="button"
            onClick={() => submitRef.current?.()}
            className={
              'w-full py-3.5 text-base rounded-[2rem] shadow-lg text-white font-semibold ' +
              (formType === 'expense'
                ? 'bg-danger-500 active:bg-danger-600'
                : 'bg-income-500 active:bg-income-600')
            }
          >
            {formEditingTx ? '更新する' : formDuplicateTx ? '複製して記録する' : '記録する'}
          </button>
        }
      >
        <OneTimeTransactionForm
          userId={userId}
          expenseCategories={expenseCategories}
          incomeCategories={incomeCategories}
          editingTx={formEditingTx}
          duplicateTx={formDuplicateTx}
          onBack={closeModal}
          onTypeChange={setFormType}
          onHeaderChange={setFormHeaderState}
          submitRef={submitRef}
        />
      </BottomSheet>
    </div>
  )
}
