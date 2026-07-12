import { useEffect, useRef, useState } from 'react'
import { CONSUMABLE_CYCLE_PRESETS, type CategoryInfo, type DefaultConsumable } from '../constants'
import { consumableService } from '../lib/services/consumableService'
import type { Consumable } from '../lib/database.types'
import { formatYen, effectiveCycleDays } from '../utils'
import { useForm, useIsDirty } from '../hooks/useForm'
import DatePicker from './ui/DatePicker'
import ConfirmDialog from './ui/ConfirmDialog'

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
  onHeaderChange?: (
    state: {
      title: string
      onBack: () => void
      action?: { label: string; onClick: () => void; disabled?: boolean; tone?: 'default' | 'danger' }
    } | null
  ) => void
}

export default function ConsumableForm({ userId, consumable, preset, householdMembers, expenseCategories, onClose, onHeaderChange }: Props) {
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
    lastPurchased: consumable?.last_purchased ?? new Date().toISOString().slice(0, 10),
    notes: consumable?.notes ?? '',
  })

  const { isDirty } = useIsDirty(values)

  // 画面遷移アニメーション中もこのコンポーネントは一瞬マウントされたままになるため、
  // 閉じることが決まった後にヘッダー登録エフェクトが再実行されてタイトルが復活しないよう防ぐ
  const closedRef = useRef(false)
  function closeAndNotify() {
    closedRef.current = true
    onClose()
  }

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

  return (
    <div className="space-y-4 pb-24">
      {error && (
        <div className="bg-danger-50 border border-danger-200 rounded-xl px-4 py-3 text-sm text-danger-600">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
        <div>
          <label className="text-xs text-slate-400">名前</label>
          <input
            value={values.name}
            onChange={(e) => { setValue('name', e.target.value); setFieldErrors((p) => ({ ...p, name: undefined })) }}
            placeholder="例: トイレットペーパー"
            className={`w-full mt-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 ${fieldErrors.name ? 'border-danger-400' : 'border-slate-200'}`}
          />
          {fieldErrors.name && <p className="text-xs text-danger-500 mt-1">{fieldErrors.name}</p>}
        </div>

        <div>
          <label className="text-xs text-slate-400">カテゴリ</label>
          <div className="grid grid-cols-3 gap-2 mt-1">
            {expenseCategories.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => setValue('category', c.name)}
                className={
                  'flex flex-col items-center py-2 rounded-xl text-xs gap-1 border ' +
                  (values.category === c.name
                    ? 'border-primary-400 bg-primary-50'
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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400">単価（円）</label>
            <input
              type="number"
              inputMode="numeric"
              value={values.amount}
              onChange={(e) => { setValue('amount', e.target.value); setFieldErrors((p) => ({ ...p, amount: undefined })) }}
              placeholder="0"
              className={`w-full mt-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 ${fieldErrors.amount ? 'border-danger-400' : 'border-slate-200'}`}
            />
            {fieldErrors.amount && <p className="text-xs text-danger-500 mt-1">{fieldErrors.amount}</p>}
          </div>
          <div>
            <label className="text-xs text-slate-400">購入個数</label>
            <input
              type="number"
              inputMode="numeric"
              value={values.quantity}
              onChange={(e) => setValue('quantity', e.target.value)}
              min="1"
              className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-400">消費サイクル</label>
          <div className="flex flex-wrap gap-2 mt-1 mb-2">
            {CONSUMABLE_CYCLE_PRESETS.map((p) => (
              <button
                key={p.days}
                type="button"
                onClick={() => setValue('cycleDays', p.days.toString())}
                className={
                  'px-3 py-1 rounded-lg text-xs font-medium border ' +
                  (values.cycleDays === p.days.toString()
                    ? 'border-primary-400 bg-primary-50 text-primary-700'
                    : 'border-slate-200 text-slate-500')
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
              className={`w-24 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 ${fieldErrors.cycleDays ? 'border-danger-400' : 'border-slate-200'}`}
            />
            <span className="text-sm text-slate-500">日おき</span>
          </div>
          {fieldErrors.cycleDays && <p className="text-xs text-danger-500 mt-1">{fieldErrors.cycleDays}</p>}
        </div>

        <div>
          <DatePicker label="最終購入日" value={values.lastPurchased} onChange={(v) => setValue('lastPurchased', v)} />
        </div>

        {previewMonthly > 0 && (
          <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-500 space-y-0.5">
            <div>実効サイクル: {previewEffectiveCycle}日おき</div>
            <div className="font-semibold text-slate-700">
              月額換算: {formatYen(previewMonthly)}
            </div>
          </div>
        )}

        <div>
          <label className="text-xs text-slate-400">メモ</label>
          <textarea
            value={values.notes}
            onChange={(e) => setValue('notes', e.target.value)}
            rows={2}
            className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none"
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
