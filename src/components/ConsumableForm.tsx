import { useState } from 'react'
import { CONSUMABLE_CATEGORIES, CONSUMABLE_CYCLE_PRESETS } from '../constants'
import { consumableService } from '../lib/services/consumableService'
import type { Consumable } from '../lib/database.types'
import { formatYen, effectiveCycleDays } from '../utils'

interface Props {
  userId: string
  consumable?: Consumable
  householdMembers: number
  onClose: () => void
}

export default function ConsumableForm({ userId, consumable, householdMembers, onClose }: Props) {
  const [name, setName] = useState(consumable?.name ?? '')
  const [category, setCategory] = useState(consumable?.category ?? CONSUMABLE_CATEGORIES[0].name)
  const [amount, setAmount] = useState(consumable?.amount.toString() ?? '')
  const [quantity, setQuantity] = useState(consumable?.quantity.toString() ?? '1')
  const [cycleDays, setCycleDays] = useState(consumable?.cycle_days.toString() ?? '30')
  const [membersScale, setMembersScale] = useState(consumable?.members_scale ?? false)
  const [lastPurchased, setLastPurchased] = useState(
    consumable?.last_purchased ?? new Date().toISOString().slice(0, 10)
  )
  const [notes, setNotes] = useState(consumable?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const previewCycle = membersScale
    ? Math.ceil(Number(cycleDays) / householdMembers)
    : Number(cycleDays)
  const previewMonthly =
    Number(amount) > 0 && Number(cycleDays) > 0
      ? Math.round((Number(amount) * Number(quantity)) / (previewCycle / 30))
      : 0

  async function save() {
    const amt = parseFloat(amount)
    const qty = parseInt(quantity)
    const days = parseInt(cycleDays)
    if (!name || isNaN(amt) || amt <= 0 || isNaN(days) || days <= 0) return
    setSaving(true)
    setError(null)
    try {
      const payload = {
        name,
        category,
        amount: amt,
        quantity: qty || 1,
        cycle_days: days,
        members_scale: membersScale,
        last_purchased: lastPurchased,
        notes: notes || null,
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
      setSaving(false)
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

  // effectiveCycleDays を直接計算（プレビュー用のオブジェクトで呼び出す）
  const previewEffectiveCycle = effectiveCycleDays(
    { members_scale: membersScale, cycle_days: Number(cycleDays) } as Consumable,
    householdMembers
  )

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
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: トイレットペーパー"
            className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
        </div>

        <div>
          <label className="text-xs text-slate-400">カテゴリ</label>
          <div className="grid grid-cols-3 gap-2 mt-1">
            {CONSUMABLE_CATEGORIES.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => setCategory(c.name)}
                className={
                  'flex flex-col items-center py-2 rounded-xl text-xs gap-1 border ' +
                  (category === c.name
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
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">購入個数</label>
            <input
              type="number"
              inputMode="numeric"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
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
                onClick={() => setCycleDays(p.days.toString())}
                className={
                  'px-3 py-1 rounded-lg text-xs font-medium border ' +
                  (cycleDays === p.days.toString()
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
              value={cycleDays}
              onChange={(e) => setCycleDays(e.target.value)}
              min="1"
              className="w-24 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
            <span className="text-sm text-slate-500">日おき</span>
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-400">同居人数スケール</label>
          <div className="mt-1 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMembersScale(!membersScale)}
              className={
                'relative w-10 h-6 rounded-full transition-colors ' +
                (membersScale ? 'bg-emerald-500' : 'bg-slate-200')
              }
            >
              <span
                className={
                  'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ' +
                  (membersScale ? 'translate-x-5' : 'translate-x-1')
                }
              />
            </button>
            <span className="text-sm text-slate-600">
              {membersScale
                ? `有効（${householdMembers}人 → 実効${previewEffectiveCycle}日おき）`
                : '無効（人数によらず固定）'}
            </span>
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-400">最終購入日</label>
          <input
            type="date"
            value={lastPurchased}
            onChange={(e) => setLastPurchased(e.target.value)}
            className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
        </div>

        {previewMonthly > 0 && (
          <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-500 space-y-0.5">
            <div>実効サイクル: {previewCycle}日おき</div>
            <div className="font-semibold text-slate-700">
              月額換算: {formatYen(previewMonthly)}
            </div>
          </div>
        )}

        <div>
          <label className="text-xs text-slate-400">メモ</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
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
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
