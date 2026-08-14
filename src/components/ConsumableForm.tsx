import { useEffect, useState } from 'react'
import { CONSUMABLE_CYCLE_PRESETS, type CategoryInfo, type DefaultConsumable } from '../constants'
import { consumableService } from '../lib/services/consumableService'
import type { Consumable } from '../lib/database.types'
import { formatYen, effectiveCycleDays, todayStr } from '../utils'
import { useForm, useIsDirty } from '../hooks/useForm'
import { useFormClose } from '../hooks/useFormClose'
import type { HeaderState } from '../types/layout'
import CategoryGrid from './ui/CategoryGrid'
import DatePicker from './ui/DatePicker'
import ConfirmDialog from './ui/ConfirmDialog'
import Input from './ui/Input'
import Textarea from './ui/Textarea'
import ErrorText from './ui/ErrorText'

interface FormValues {
  name: string
  category: string
  amount: string
  quantity: string
  cycleDays: string
  membersScale: boolean
  lastPurchased: string
  notes: string
}

interface Props {
  userId: string
  consumable?: Consumable
  preset?: DefaultConsumable
  householdMembers: number
  expenseCategories: CategoryInfo[]
  onClose: () => void
  onHeaderChange?: (state: HeaderState | null) => void
  submitRef?: React.MutableRefObject<(() => void) | null>
}

export default function ConsumableForm({ userId, consumable, preset, householdMembers, expenseCategories, onClose, onHeaderChange, submitRef }: Props) {
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormValues, string>>>({})
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { values, setValue, isSubmitting, setIsSubmitting, error, setError } = useForm<FormValues>({
    name: consumable?.name ?? preset?.name ?? '',
    category: consumable?.category ?? preset?.category ?? expenseCategories[0]?.name ?? '',
    amount: consumable?.amount.toString() ?? preset?.amount.toString() ?? '',
    quantity: consumable?.quantity.toString() ?? preset?.quantity.toString() ?? '1',
    cycleDays: consumable?.cycle_days.toString() ?? preset?.cycle_days.toString() ?? '30',
    membersScale: consumable?.members_scale ?? preset?.members_scale ?? false,
    lastPurchased: consumable?.last_purchased ?? todayStr(),
    notes: consumable?.notes ?? '',
  })

  const { isDirty } = useIsDirty(values)

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
      title: consumable ? '定期購入を編集' : '定期購入を追加',
      onBack: requestBack,
      action: consumable
        ? { label: '削除', onClick: () => setConfirmDelete(true), disabled: isSubmitting, tone: 'danger' }
        : undefined,
    })
  }, [consumable, isDirty, isSubmitting]) // eslint-disable-line react-hooks/exhaustive-deps

  const previewEffectiveCycle = effectiveCycleDays(
    { members_scale: values.membersScale, cycle_days: Number(values.cycleDays) } as Consumable,
    householdMembers
  )
  const previewMonthly =
    Number(values.amount) > 0 && Number(values.cycleDays) > 0
      ? Math.round((Number(values.amount) * Number(values.quantity)) / (previewEffectiveCycle / 30))
      : 0

  async function save() {
    const amt = parseFloat(values.amount)
    const qty = parseInt(values.quantity)
    const days = parseInt(values.cycleDays)
    const errors: Partial<Record<keyof FormValues, string>> = {}
    if (!values.name) errors.name = '名前を入力してください'
    if (!values.amount || isNaN(amt) || amt <= 0) errors.amount = '0より大きい金額を入力してください'
    if (!values.cycleDays || isNaN(days) || days <= 0) errors.cycleDays = '1以上のサイクル日数を入力してください'
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})
    setIsSubmitting(true)
    setError(null)
    try {
      const payload = {
        name: values.name,
        category: values.category,
        amount: amt,
        quantity: qty || 1,
        cycle_days: days,
        members_scale: values.membersScale,
        last_purchased: values.lastPurchased,
        notes: values.notes || null,
      }
      if (consumable) {
        await consumableService.update(consumable.id, payload)
      } else {
        await consumableService.insert({ user_id: userId, ...payload })
      }
      closeAndNotify()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function remove() {
    if (!consumable) return
    setError(null)
    try {
      await consumableService.delete(consumable.id)
      closeAndNotify()
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました')
    }
  }

  if (submitRef) submitRef.current = save

  return (
    <div className="space-y-4">
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
            onChange={(e) => { setValue('name', e.target.value); setFieldErrors((p) => ({ ...p, name: undefined })) }}
            placeholder="例: トイレットペーパー"
            error={!!fieldErrors.name}
            className="mt-1"
          />
          <ErrorText>{fieldErrors.name}</ErrorText>
        </div>

        <div>
          <label className="text-xs text-ink-muted">カテゴリ</label>
          <CategoryGrid
            categories={expenseCategories}
            selected={values.category}
            onSelect={(name) => setValue('category', name)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-ink-muted">単価（円）</label>
            <input
              type="number"
              inputMode="numeric"
              value={values.amount}
              onChange={(e) => { setValue('amount', e.target.value); setFieldErrors((p) => ({ ...p, amount: undefined })) }}
              placeholder="0"
              className={`w-full mt-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 ${fieldErrors.amount ? 'border-danger-400' : 'border-line'}`}
            />
            <ErrorText>{fieldErrors.amount}</ErrorText>
          </div>
          <div>
            <label className="text-xs text-ink-muted">購入個数</label>
            <Input
              type="number"
              inputMode="numeric"
              value={values.quantity}
              onChange={(e) => setValue('quantity', e.target.value)}
              min="1"
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-ink-muted">消費サイクル</label>
          <div className="flex flex-wrap gap-2 mt-1 mb-2">
            {CONSUMABLE_CYCLE_PRESETS.map((p) => (
              <button
                key={p.days}
                type="button"
                onClick={() => setValue('cycleDays', p.days.toString())}
                className={
                  'px-3 py-1 rounded-lg text-xs font-medium border ' +
                  (values.cycleDays === p.days.toString()
                    ? 'border-primary-400 bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-400'
                    : 'border-line text-ink-muted')
                }
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              value={values.cycleDays}
              onChange={(e) => { setValue('cycleDays', e.target.value); setFieldErrors((p) => ({ ...p, cycleDays: undefined })) }}
              min="1"
              className={`w-24 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 ${fieldErrors.cycleDays ? 'border-danger-400' : 'border-line'}`}
            />
            <span className="text-sm text-ink-muted">日おき</span>
          </div>
          <ErrorText>{fieldErrors.cycleDays}</ErrorText>
        </div>

        <div>
          <DatePicker label="最終購入日" value={values.lastPurchased} onChange={(v) => setValue('lastPurchased', v)} />
        </div>

        {previewMonthly > 0 && (
          <div className="bg-surface-subtle rounded-xl p-3 text-xs text-ink-muted space-y-0.5">
            <div>実効サイクル: {previewEffectiveCycle}日おき</div>
            <div className="font-semibold text-ink">
              月額換算: {formatYen(previewMonthly)}
            </div>
          </div>
        )}

        <div>
          <label className="text-xs text-ink-muted">メモ</label>
          <Textarea
            value={values.notes}
            onChange={(e) => setValue('notes', e.target.value)}
            rows={2}
            className="mt-1"
          />
        </div>

      </div>

      {showDiscardConfirm && (
        <ConfirmDialog
          message="入力内容を破棄しますか？"
          confirmLabel="破棄する"
          onConfirm={() => { setShowDiscardConfirm(false); closeAndNotify() }}
          onCancel={() => setShowDiscardConfirm(false)}
        />
      )}

      {confirmDelete && consumable && (
        <ConfirmDialog
          message={`「${consumable.name}」を削除しますか？`}
          onConfirm={remove}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  )
}
