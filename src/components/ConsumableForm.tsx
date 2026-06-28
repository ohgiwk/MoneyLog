import { useState } from 'react'
import { CONSUMABLE_CATEGORIES, CONSUMABLE_CYCLE_PRESETS, type DefaultConsumable } from '../constants'
import { consumableService } from '../lib/services/consumableService'
import type { Consumable } from '../lib/database.types'
import { formatYen, effectiveCycleDays } from '../utils'
import { useForm } from '../hooks/useForm'
import DatePicker from './ui/DatePicker'

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
  onClose: () => void
}

export default function ConsumableForm({ userId, consumable, preset, householdMembers, onClose }: Props) {
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormValues, string>>>({})
  const { values, setValue, isSubmitting, setIsSubmitting, error, setError } = useForm<FormValues>({
    name: consumable?.name ?? preset?.name ?? '',
    category: consumable?.category ?? preset?.category ?? CONSUMABLE_CATEGORIES[0].name,
    amount: consumable?.amount.toString() ?? preset?.amount.toString() ?? '',
    quantity: consumable?.quantity.toString() ?? preset?.quantity.toString() ?? '1',
    cycleDays: consumable?.cycle_days.toString() ?? preset?.cycle_days.toString() ?? '30',
    membersScale: consumable?.members_scale ?? preset?.members_scale ?? false,
    lastPurchased: consumable?.last_purchased ?? new Date().toISOString().slice(0, 10),
    notes: consumable?.notes ?? '',
  })

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
      onClose()
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
          {consumable ? '消耗品を編集' : '消耗品を追加'}
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
            onChange={(e) => { setValue('name', e.target.value); setFieldErrors((p) => ({ ...p, name: undefined })) }}
            placeholder="例: トイレットペーパー"
            className={`w-full mt-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 ${fieldErrors.name ? 'border-rose-400' : 'border-slate-200'}`}
          />
          {fieldErrors.name && <p className="text-xs text-rose-500 mt-1">{fieldErrors.name}</p>}
        </div>

        <div>
          <label className="text-xs text-slate-400">カテゴリ</label>
          <div className="grid grid-cols-3 gap-2 mt-1">
            {CONSUMABLE_CATEGORIES.map((c) => (
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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400">単価（円）</label>
            <input
              type="number"
              inputMode="numeric"
              value={values.amount}
              onChange={(e) => { setValue('amount', e.target.value); setFieldErrors((p) => ({ ...p, amount: undefined })) }}
              placeholder="0"
              className={`w-full mt-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 ${fieldErrors.amount ? 'border-rose-400' : 'border-slate-200'}`}
            />
            {fieldErrors.amount && <p className="text-xs text-rose-500 mt-1">{fieldErrors.amount}</p>}
          </div>
          <div>
            <label className="text-xs text-slate-400">購入個数</label>
            <input
              type="number"
              inputMode="numeric"
              value={values.quantity}
              onChange={(e) => setValue('quantity', e.target.value)}
              min="1"
              className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
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
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
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
              className={`w-24 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 ${fieldErrors.cycleDays ? 'border-rose-400' : 'border-slate-200'}`}
            />
            <span className="text-sm text-slate-500">日おき</span>
          </div>
          {fieldErrors.cycleDays && <p className="text-xs text-rose-500 mt-1">{fieldErrors.cycleDays}</p>}
        </div>

        <div>
          <label className="text-xs text-slate-400">同居人数スケール</label>
          <div className="mt-1 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setValue('membersScale', !values.membersScale)}
              className={
                'relative w-10 h-6 rounded-full transition-colors ' +
                (values.membersScale ? 'bg-emerald-500' : 'bg-slate-200')
              }
            >
              <span
                className={
                  'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ' +
                  (values.membersScale ? 'translate-x-5' : 'translate-x-1')
                }
              />
            </button>
            <span className="text-sm text-slate-600">
              {values.membersScale
                ? `有効（${householdMembers}人 → 実効${previewEffectiveCycle}日おき）`
                : '無効（人数によらず固定）'}
            </span>
          </div>
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
            className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          {consumable && (
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
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm font-semibold active:bg-slate-50"
        >
          キャンセル
        </button>
      </div>
    </div>
  )
}
