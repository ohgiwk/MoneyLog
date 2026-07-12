import { useState, type FormEvent } from 'react'
import type { CategoryInfo, PaymentType } from '../constants'
import type { Transaction } from '../lib/database.types'
import { transactionService } from '../lib/services/transactionService'
import { getDefaultPayment } from './usePaymentMethods'
import { todayStr } from '../utils'
import { useForm } from './useForm'

interface OneTimeFormValues {
  type: 'expense' | 'income'
  date: string
  category: string
  amount: string
  memo: string
  storeType: string
  mealType: string
  paymentType: PaymentType | ''
  paymentMethod: string
}

interface Options {
  userId: string
  expenseCategories: CategoryInfo[]
  incomeCategories: CategoryInfo[]
  editingTx?: Transaction | null
  onBack?: () => void
}

export function useOneTimeForm({
  userId,
  expenseCategories,
  incomeCategories,
  editingTx,
  onBack,
}: Options) {
  const [showSuccess, setShowSuccess] = useState(false)
  const [amountError, setAmountError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  function buildDefaultValues(): OneTimeFormValues {
    const defaultPayment = getDefaultPayment()
    return {
      type: 'expense',
      date: todayStr(),
      category: expenseCategories[0]?.name ?? '',
      amount: '',
      memo: '',
      storeType: '',
      mealType: '',
      paymentType: defaultPayment.type,
      paymentMethod: defaultPayment.name ?? '',
    }
  }

  const { values, setValue, setValues, isSubmitting, setIsSubmitting, error, setError, reset } =
    useForm<OneTimeFormValues>(buildDefaultValues())

  // フォームが未編集かどうかの判定基準（最後に読み込んだ／保存した状態のスナップショット）
  const [initialSnapshot, setInitialSnapshot] = useState(() => JSON.stringify(values))
  const isDirty = JSON.stringify(values) !== initialSnapshot

  const formCategories = values.type === 'expense' ? expenseCategories : incomeCategories

  // editingTx が変わったらフォームの値を読み込む
  // （レンダー中に前回値と比較して即座に補正する React 推奨パターン）
  const [prevEditingTx, setPrevEditingTx] = useState(editingTx)
  if (editingTx !== prevEditingTx) {
    setPrevEditingTx(editingTx)
    if (editingTx) {
      const loaded: OneTimeFormValues = {
        type: editingTx.type as 'expense' | 'income',
        date: editingTx.date,
        category: editingTx.category,
        amount: String(editingTx.amount),
        memo: editingTx.memo ?? '',
        storeType: editingTx.store_type ?? '',
        mealType: editingTx.meal_type ?? '',
        paymentType: (editingTx.payment_type as PaymentType | null) ?? '',
        paymentMethod: editingTx.payment_method ?? '',
      }
      setValues(loaded)
      setInitialSnapshot(JSON.stringify(loaded))
    }
  }

  function resetForm() {
    reset()
    const next = buildDefaultValues()
    setValues(next)
    setInitialSnapshot(JSON.stringify(next))
  }

  function handleTypeChange(newType: 'expense' | 'income') {
    const cats = newType === 'expense' ? expenseCategories : incomeCategories
    setValues({
      ...values,
      type: newType,
      category: cats[0]?.name ?? '',
      storeType: newType === 'expense' ? values.storeType : '',
      mealType: '',
    })
  }

  function selectCategory(category: string) {
    setValues({
      ...values,
      category,
      mealType: category === '食費' ? values.mealType : '',
    })
  }

  function selectPaymentType(type: PaymentType) {
    setValues({
      ...values,
      paymentType: type,
      paymentMethod: type === values.paymentType ? values.paymentMethod : '',
    })
  }

  async function handleDelete() {
    if (!editingTx) return
    setIsSubmitting(true)
    try {
      await transactionService.delete(editingTx.id)
      onBack?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault()
    const amt = parseFloat(values.amount)
    if (!amt || amt <= 0) {
      setAmountError('正しい金額を入力してください')
      return
    }
    setAmountError(null)
    setError(null)
    setIsSubmitting(true)
    try {
      if (editingTx) {
        await transactionService.update(editingTx.id, {
          type: values.type,
          expense_kind: values.type === 'expense' ? (editingTx.expense_kind ?? 'one_time') : null,
          date: values.date,
          category: values.category,
          amount: amt,
          memo: values.memo.trim() || null,
          store_type: values.type === 'expense' ? values.storeType || null : null,
          meal_type: values.type === 'expense' && values.category === '食費' ? values.mealType || null : null,
          payment_type: values.type === 'expense' ? values.paymentType || null : null,
          payment_method:
            values.type === 'expense' && values.paymentType && values.paymentType !== 'cash'
              ? values.paymentMethod || null
              : null,
        })
        onBack?.()
      } else {
        await transactionService.insert({
          user_id: userId,
          type: values.type,
          expense_kind: values.type === 'expense' ? 'one_time' : null,
          date: values.date,
          category: values.category,
          amount: amt,
          memo: values.memo.trim() || null,
          store_type: values.type === 'expense' ? values.storeType || null : null,
          meal_type: values.type === 'expense' && values.category === '食費' ? values.mealType || null : null,
          payment_type: values.type === 'expense' ? values.paymentType || null : null,
          payment_method:
            values.type === 'expense' && values.paymentType && values.paymentType !== 'cash'
              ? values.paymentMethod || null
              : null,
          recurring_rule_id: null,
        })
        resetForm()
        setShowSuccess(true)
        return
      }
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : '記録に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    values,
    setValue,
    formCategories,
    isSubmitting,
    isDirty,
    error,
    showSuccess,
    setShowSuccess,
    amountError,
    setAmountError,
    confirmDelete,
    setConfirmDelete,
    handleTypeChange,
    selectCategory,
    selectPaymentType,
    handleSubmit,
    handleDelete,
    resetForm,
  }
}
