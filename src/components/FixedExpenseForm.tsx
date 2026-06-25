import { useState } from 'react'
import {
  STATUS_LABELS,
  SUBSCRIPTION_PRESETS,
  SUBSCRIPTION_SUBCATEGORIES,
  type CategoryInfo,
} from '../constants'
import { fixedExpenseService } from '../lib/services/fixedExpenseService'
import type { FixedExpense } from '../lib/database.types'

interface Props {
  userId?: string
  expense?: FixedExpense
  fixedCategories: CategoryInfo[]
  onClose: () => void
}

export default function FixedExpenseForm({ userId, expense, fixedCategories, onClose }: Props) {
  const [name, setName] = useState(expense?.name ?? '')
  const [category, setCategory] = useState(expense?.category ?? fixedCategories[0]?.name ?? '')
  const [subSubcategory, setSubSubcategory] = useState<string>(() => {
    if (expense?.category === 'サブスク') {
      const found = SUBSCRIPTION_PRESETS.find((p) => p.name === expense?.name)
      return found?.subcategory ?? SUBSCRIPTION_SUBCATEGORIES[0].name
    }
    return SUBSCRIPTION_SUBCATEGORIES[0].name
  })
  const [amount, setAmount] = useState(expense?.amount != null ? expense.amount.toString() : '')
  const [cycle, setCycle] = useState<FixedExpense['cycle']>(expense?.cycle ?? 'monthly')
  const [status, setStatus] = useState<FixedExpense['status']>(expense?.status ?? 'active')
  const [notes, setNotes] = useState(expense?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    const amt = parseFloat(amount)
    if (!name || isNaN(amt) || amt < 0) return
    setSaving(true)
    setError(null)
    try {
      if (expense) {
        await fixedExpenseService.update(expense.id, {
          name,
          category,
          amount: amt,
          cycle,
          status,
          notes: notes || null,
        })
      } else {
        await fixedExpenseService.insert({
          user_id: userId!,
          name,
          category,
          amount: amt,
          baseline_amount: amt,
          cycle,
          status,
          notes: notes || null,
          start_date: new Date().toISOString().slice(0, 10),
          billing_day: null,
        })
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!expense) return
    setError(null)
    try {
      await fixedExpenseService.delete(expense.id)
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
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: Netflix"
            className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
        </div>

        <div>
          <label className="text-xs text-slate-400">カテゴリ</label>
          <div className="grid grid-cols-4 gap-2 mt-1">
            {fixedCategories.map((c) => (
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

        {category === 'サブスク' && (
          <div className="space-y-2">
            <div>
              <label className="text-xs text-slate-400">サービスカテゴリ</label>
              <select
                value={subSubcategory}
                onChange={(e) => setSubSubcategory(e.target.value)}
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
                value={name}
                onChange={(e) => {
                  const preset = SUBSCRIPTION_PRESETS.find((p) => p.name === e.target.value)
                  if (preset) {
                    setName(preset.name)
                    setAmount(preset.amount.toString())
                    setCycle(preset.cycle)
                  } else {
                    setName(e.target.value)
                  }
                }}
              >
                <option value="">-- サービスを選択 --</option>
                {SUBSCRIPTION_PRESETS.filter((p) => p.subcategory === subSubcategory).map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}（{p.amount.toLocaleString()}円/{p.cycle === 'monthly' ? '月' : '年'}）
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400">金額</label>
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
            <label className="text-xs text-slate-400">サイクル</label>
            <select
              value={cycle}
              onChange={(e) => setCycle(e.target.value as FixedExpense['cycle'])}
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
                onClick={() => setStatus(s)}
                className={
                  'flex-1 py-1.5 rounded-lg text-xs font-semibold border ' +
                  (status === s
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
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
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
