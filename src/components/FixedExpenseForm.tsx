import { useEffect, useState } from 'react'
import {
  STATUS_LABELS,
  type CategoryInfo,
  type SubscriptionPreset,
} from '../constants'
import { fixedExpenseService } from '../lib/services/fixedExpenseService'
import type { FixedExpense } from '../lib/database.types'
import { useForm, useIsDirty } from '../hooks/useForm'
import { useFormClose } from '../hooks/useFormClose'
import type { HeaderState } from '../types/layout'
import {
  getUsdJpyRate,
  getExpenseCurrencyMeta,
  setExpenseCurrencyMeta,
  removeExpenseCurrencyMeta,
} from '../lib/exchangeRate'
import { todayStr } from '../utils'
import CategoryGrid from './ui/CategoryGrid'
import ConfirmDialog from './ui/ConfirmDialog'
import CelebrationDialog from './ui/CelebrationDialog'
import Input from './ui/Input'
import Textarea from './ui/Textarea'
import ErrorText from './ui/ErrorText'

interface FormValues {
  name: string
  category: string
  subSubcategory: string
  amount: string
  cycle: FixedExpense['cycle']
  status: FixedExpense['status']
  notes: string
}

interface Props {
  userId?: string
  expense?: FixedExpense
  fixedCategories: CategoryInfo[]
  onClose: () => void
  onOpenSubscriptionPicker?: () => void
  presetToApply?: SubscriptionPreset | null
  onPresetApplied?: () => void
  focusSignal?: number
  onHeaderChange?: (state: HeaderState | null) => void
}

export default function FixedExpenseForm({ userId, expense, fixedCategories, onClose, onOpenSubscriptionPicker, presetToApply, onPresetApplied, focusSignal, onHeaderChange }: Props) {
  const [nameError, setNameError] = useState<string | null>(null)
  const [amountError, setAmountError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const [celebration, setCelebration] = useState<{ monthly: number; yearly: number } | null>(null)
  const [currency, setCurrency] = useState<'JPY' | 'USD'>(() => {
    if (expense?.id) {
      const meta = getExpenseCurrencyMeta(expense.id)
      if (meta?.currency === 'USD') return 'USD'
    }
    return 'JPY'
  })
  const [usdRate, setUsdRate] = useState(getUsdJpyRate())

  const { values, setValue, isSubmitting, setIsSubmitting, error, setError } = useForm<FormValues>({
    name: expense?.name ?? '',
    category: expense?.category ?? fixedCategories[0]?.name ?? '',
    subSubcategory: '',
    amount: (() => {
      if (expense?.id) {
        const meta = getExpenseCurrencyMeta(expense.id)
        if (meta?.currency === 'USD') return meta.usdAmount.toString()
      }
      return expense?.amount != null ? expense.amount.toString() : ''
    })(),
    cycle: expense?.cycle ?? 'monthly',
    status: expense?.status ?? 'active',
    notes: expense?.notes ?? '',
  })

  const { isDirty } = useIsDirty({ ...values, currency })

  const { closedRef, closeAndNotify } = useFormClose(onClose)

  function requestBack() {
    if (isDirty) {
      setShowDiscardConfirm(true)
    } else {
      closeAndNotify()
    }
  }

  // ヘッダーに戻るボタンを表示する。編集時は削除ボタンも表示する
  useEffect(() => {
    if (closedRef.current) return
    onHeaderChange?.({
      title: expense ? '固定費を編集' : '固定費を追加',
      onBack: requestBack,
      action: expense
        ? { label: '削除', onClick: () => setConfirmDelete(true), disabled: isSubmitting, tone: 'danger' }
        : undefined,
    })
  }, [expense, isDirty, isSubmitting, focusSignal]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!presetToApply) return
    setValue('name', presetToApply.name)
    setValue('cycle', presetToApply.cycle)
    if (presetToApply.currency === 'USD') {
      setCurrency('USD')
      setUsdRate(getUsdJpyRate())
      setValue('amount', (presetToApply.usdAmount ?? 0).toString())
    } else {
      setCurrency('JPY')
      setValue('amount', presetToApply.amount.toString())
    }
    onPresetApplied?.()
  }, [presetToApply]) // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    const inputAmt = parseFloat(values.amount)
    let hasError = false
    if (!values.name.trim()) {
      setNameError('名前を入力してください')
      hasError = true
    } else {
      setNameError(null)
    }
    if (!values.amount || isNaN(inputAmt) || inputAmt < 0) {
      setAmountError('正しい金額を入力してください')
      hasError = true
    } else {
      setAmountError(null)
    }
    if (hasError) return

    const jpyAmount = currency === 'USD' ? Math.round(inputAmt * usdRate) : inputAmt

    setIsSubmitting(true)
    setError(null)
    try {
      if (expense) {
        await fixedExpenseService.update(expense.id, {
          name: values.name,
          category: values.category,
          amount: jpyAmount,
          cycle: values.cycle,
          status: values.status,
          notes: values.notes || null,
        })
        if (currency === 'USD') {
          setExpenseCurrencyMeta(expense.id, { currency: 'USD', usdAmount: inputAmt })
        } else {
          removeExpenseCurrencyMeta(expense.id)
        }
      } else {
        const inserted = await fixedExpenseService.insert({
          user_id: userId!,
          name: values.name,
          category: values.category,
          amount: jpyAmount,
          baseline_amount: jpyAmount,
          cycle: values.cycle,
          status: values.status,
          notes: values.notes || null,
          start_date: todayStr(),
          billing_day: null,
        })
        if (currency === 'USD' && inserted?.id) {
          setExpenseCurrencyMeta(inserted.id, { currency: 'USD', usdAmount: inputAmt })
        }
      }
      // 契約中・見直し中 → 解約済み への変更時はお祝いダイアログを表示
      const wasActive = expense && ['active', 'reviewing'].includes(expense.status)
      const nowCancelled = ['cancelled', 'unsubscribed'].includes(values.status)
      if (wasActive && nowCancelled) {
        const monthly = expense!.cycle === 'yearly' ? Math.round(jpyAmount / 12) : jpyAmount
        const yearly = expense!.cycle === 'yearly' ? jpyAmount : jpyAmount * 12
        setCelebration({ monthly, yearly })
      } else {
        closeAndNotify()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function remove() {
    if (!expense) return
    setError(null)
    try {
      await fixedExpenseService.delete(expense.id)
      removeExpenseCurrencyMeta(expense.id)
      closeAndNotify()
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました')
    }
  }

  return (
    <div className="space-y-4 pb-24">
      {error && (
        <div className="bg-danger-50 border border-danger-200 rounded-xl px-4 py-3 text-sm text-danger-600">
          {error}
        </div>
      )}

      <div className="bg-surface rounded-2xl p-4 shadow-sm space-y-4">
        <div>
          <label className="text-xs text-ink-muted">名前</label>
          <Input
            value={values.name}
            onChange={(e) => { setValue('name', e.target.value); if (nameError) setNameError(null) }}
            placeholder="例: Netflix"
            error={!!nameError}
            className="mt-1"
          />
          <ErrorText>{nameError}</ErrorText>
        </div>

        <div>
          <label className="text-xs text-ink-muted">カテゴリ</label>
          <CategoryGrid
            categories={fixedCategories}
            selected={values.category}
            onSelect={(name) => setValue('category', name)}
          />
        </div>

        {values.category === 'サブスク' && (
          <button
            type="button"
            onClick={() => onOpenSubscriptionPicker?.()}
            className="w-full py-2 rounded-xl border border-line bg-surface text-sm font-medium text-ink active:bg-surface-subtle"
          >
            サブスク一覧から選択する →
          </button>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-ink-muted">金額</label>
              <div className="flex rounded-lg overflow-hidden border border-line text-xs">
                {(['JPY', 'USD'] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setCurrency(c)
                      setValue('amount', '')
                      setUsdRate(getUsdJpyRate())
                    }}
                    className={`px-2 py-0.5 font-medium ${currency === c ? 'bg-primary-500 text-white' : 'bg-surface text-ink-muted'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted pointer-events-none select-none">
                {currency === 'USD' ? '$' : '¥'}
              </span>
              <Input
                type="number"
                inputMode="decimal"
                value={values.amount}
                onChange={(e) => { setValue('amount', e.target.value); if (amountError) setAmountError(null) }}
                placeholder="0"
                error={!!amountError}
                className="pl-7 pr-3"
              />
            </div>
            {currency === 'USD' && values.amount && !isNaN(parseFloat(values.amount)) && (
              <p className="text-xs text-ink-muted mt-1">
                ≈ {Math.round(parseFloat(values.amount) * usdRate).toLocaleString()}円
                （1USD={usdRate}円）
              </p>
            )}
            <ErrorText>{amountError}</ErrorText>
          </div>
          <div>
            <label className="text-xs text-ink-muted">サイクル</label>
            <select
              value={values.cycle}
              onChange={(e) => setValue('cycle', e.target.value as FixedExpense['cycle'])}
              className="w-full mt-1 border border-line rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
            >
              <option value="monthly">毎月</option>
              <option value="yearly">毎年</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-ink-muted">ステータス</label>
          <div className="flex gap-2 mt-1">
            {(['active', 'reviewing', 'unsubscribed', 'cancelled'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setValue('status', s)}
                className={
                  'flex-1 py-1.5 rounded-lg text-xs font-semibold border ' +
                  (values.status === s
                    ? `${STATUS_LABELS[s].color} border-current`
                    : 'border-line-subtle text-ink-muted')
                }
              >
                {STATUS_LABELS[s].label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-ink-muted">メモ</label>
          <Textarea
            value={values.notes}
            onChange={(e) => setValue('notes', e.target.value)}
            rows={3}
            className="mt-1"
          />
        </div>

      </div>

      {/* 保存ボタン（タブメニュー上にフローティング表示） */}
      <div className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] left-0 right-0 max-w-md mx-auto px-4 z-20 flex justify-center">
        <button
          onClick={save}
          disabled={isSubmitting}
          className="w-[60%] py-3.5 rounded-[2rem] bg-primary-500 text-white font-semibold text-sm shadow-lg disabled:opacity-50 active:bg-primary-600"
        >
          {isSubmitting ? '保存中...' : '保存'}
        </button>
      </div>

      {showDiscardConfirm && (
        <ConfirmDialog
          message="入力内容を破棄しますか？"
          confirmLabel="破棄する"
          onConfirm={() => { setShowDiscardConfirm(false); closeAndNotify() }}
          onCancel={() => setShowDiscardConfirm(false)}
        />
      )}

      {celebration && expense && (
        <CelebrationDialog
          savingsMonthly={celebration.monthly}
          savingsYearly={celebration.yearly}
          itemName={expense.name}
          onClose={closeAndNotify}
        />
      )}

      {confirmDelete && expense && (
        <ConfirmDialog
          message={`「${expense.name}」を削除しますか？`}
          onConfirm={remove}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  )
}
