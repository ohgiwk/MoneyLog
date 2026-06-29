import { useEffect, useState } from 'react'
import {
  STATUS_LABELS,
  SUBSCRIPTION_PRESETS,
  SUBSCRIPTION_SUBCATEGORIES,
  type CategoryInfo,
} from '../constants'
import { fixedExpenseService } from '../lib/services/fixedExpenseService'
import type { FixedExpense } from '../lib/database.types'
import { useForm } from '../hooks/useForm'
import {
  getUsdJpyRate,
  getExpenseCurrencyMeta,
  setExpenseCurrencyMeta,
  removeExpenseCurrencyMeta,
} from '../lib/exchangeRate'

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
}

export default function FixedExpenseForm({ userId, expense, fixedCategories, onClose }: Props) {
  const initialSubSubcategory = (() => {
    if (expense?.category === 'サブスク') {
      return (
        SUBSCRIPTION_PRESETS.find((p) => p.name === expense?.name)?.subcategory ??
        SUBSCRIPTION_SUBCATEGORIES[0].name
      )
    }
    return SUBSCRIPTION_SUBCATEGORIES[0].name
  })()

  const [nameError, setNameError] = useState<string | null>(null)
  const [amountError, setAmountError] = useState<string | null>(null)
  const [currency, setCurrency] = useState<'JPY' | 'USD'>('JPY')
  const [usdRate, setUsdRate] = useState(getUsdJpyRate())

  useEffect(() => {
    if (expense?.id) {
      const meta = getExpenseCurrencyMeta(expense.id)
      if (meta?.currency === 'USD') {
        setCurrency('USD')
      }
    }
  }, [expense?.id])

  const { values, setValue, isSubmitting, setIsSubmitting, error, setError } = useForm<FormValues>({
    name: expense?.name ?? '',
    category: expense?.category ?? fixedCategories[0]?.name ?? '',
    subSubcategory: initialSubSubcategory,
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
          start_date: new Date().toISOString().slice(0, 10),
          billing_day: null,
        })
        if (currency === 'USD' && inserted?.id) {
          setExpenseCurrencyMeta(inserted.id, { currency: 'USD', usdAmount: inputAmt })
        }
      }
      onClose()
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
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 active:bg-slate-200 text-lg"
        >
          ‹
        </button>
        <span className="text-sm font-semibold text-slate-700">
          {expense ? '固定費を編集' : '固定費を追加'}
        </span>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-600">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
        <div>
          <label className="text-xs text-slate-400">名前</label>
          <input
            value={values.name}
            onChange={(e) => { setValue('name', e.target.value); if (nameError) setNameError(null) }}
            placeholder="例: Netflix"
            className={`w-full mt-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 ${nameError ? 'border-rose-300' : 'border-slate-200'}`}
          />
          {nameError && <p className="text-xs text-rose-500 mt-1">{nameError}</p>}
        </div>

        <div>
          <label className="text-xs text-slate-400">カテゴリ</label>
          <div className="grid grid-cols-4 gap-2 mt-1">
            {fixedCategories.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => setValue('category', c.name)}
                className={
                  'flex flex-col items-center py-2 rounded-xl text-xs gap-1 border ' +
                  (values.category === c.name
                    ? 'border-emerald-400 bg-emerald-50'
                    : 'border-slate-100 bg-slate-50')
                }
              >
                <span className="text-base">{c.icon}</span>
                <span className="text-[10px] text-slate-600 text-center leading-tight">
                  {c.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {values.category === 'サブスク' && (
          <div className="space-y-2">
            <div>
              <label className="text-xs text-slate-400">サービスカテゴリ</label>
              <select
                value={values.subSubcategory}
                onChange={(e) => setValue('subSubcategory', e.target.value)}
                className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 text-slate-600"
              >
                {SUBSCRIPTION_SUBCATEGORIES.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.icon} {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400">サービスから選ぶ（任意）</label>
              <select
                className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 text-slate-600"
                value={values.name}
                onChange={(e) => {
                  const preset = SUBSCRIPTION_PRESETS.find((p) => p.name === e.target.value)
                  if (preset) {
                    setValue('name', preset.name)
                    setValue('cycle', preset.cycle)
                    if (preset.currency === 'USD') {
                      setCurrency('USD')
                      setUsdRate(getUsdJpyRate())
                      setValue('amount', (preset.usdAmount ?? 0).toString())
                    } else {
                      setCurrency('JPY')
                      setValue('amount', preset.amount.toString())
                    }
                  } else {
                    setValue('name', e.target.value)
                  }
                }}
              >
                <option value="">-- サービスを選択 --</option>
                {SUBSCRIPTION_PRESETS.filter((p) => p.subcategory === values.subSubcategory).map(
                  (p) => (
                    <option key={p.name} value={p.name}>
                      {p.currency === 'USD'
                        ? `${p.name}（$${p.usdAmount}/${p.cycle === 'monthly' ? '月' : '年'}）`
                        : `${p.name}（${p.amount.toLocaleString()}円/${p.cycle === 'monthly' ? '月' : '年'}）`}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-slate-400">金額</label>
              <div className="flex rounded-lg overflow-hidden border border-slate-200 text-xs">
                {(['JPY', 'USD'] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setCurrency(c)
                      setValue('amount', '')
                      setUsdRate(getUsdJpyRate())
                    }}
                    className={`px-2 py-0.5 font-medium ${currency === c ? 'bg-emerald-500 text-white' : 'bg-white text-slate-400'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none select-none">
                {currency === 'USD' ? '$' : '¥'}
              </span>
              <input
                type="number"
                inputMode="decimal"
                value={values.amount}
                onChange={(e) => { setValue('amount', e.target.value); if (amountError) setAmountError(null) }}
                placeholder="0"
                className={`w-full border rounded-xl pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 ${amountError ? 'border-rose-300' : 'border-slate-200'}`}
              />
            </div>
            {currency === 'USD' && values.amount && !isNaN(parseFloat(values.amount)) && (
              <p className="text-xs text-slate-400 mt-1">
                ≈ {Math.round(parseFloat(values.amount) * usdRate).toLocaleString()}円
                （1USD={usdRate}円）
              </p>
            )}
            {amountError && <p className="text-xs text-rose-500 mt-1">{amountError}</p>}
          </div>
          <div>
            <label className="text-xs text-slate-400">サイクル</label>
            <select
              value={values.cycle}
              onChange={(e) => setValue('cycle', e.target.value as FixedExpense['cycle'])}
              className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            >
              <option value="monthly">毎月</option>
              <option value="yearly">毎年</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-400">ステータス</label>
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
                    : 'border-slate-100 text-slate-400')
                }
              >
                {STATUS_LABELS[s].label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-400">メモ</label>
          <textarea
            value={values.notes}
            onChange={(e) => setValue('notes', e.target.value)}
            placeholder=""
            rows={3}
            className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          {expense && (
            <button
              onClick={remove}
              className="px-4 py-2.5 rounded-xl border border-rose-200 text-rose-500 text-sm font-semibold"
            >
              削除
            </button>
          )}
          <button
            onClick={save}
            disabled={isSubmitting}
            className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold disabled:opacity-50"
          >
            {isSubmitting ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
