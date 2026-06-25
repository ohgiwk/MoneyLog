import { useEffect, useMemo, useState } from 'react'
import { DEFAULT_FIXED_EXPENSES, FIXED_EXPENSE_CATEGORIES, STATUS_LABELS } from '../constants'
import { supabase } from '../lib/supabase'
import type { FixedExpense, Transaction } from '../lib/database.types'
import { categoryInfo, formatYen, monthKey } from '../utils'
import MonthSwitcher from './ui/MonthSwitcher'
import ProgressBar from './ui/ProgressBar'

type SubPage = 'overview' | 'fixed' | 'goals'

interface Props {
  userId: string
  month: string
  setMonth: (m: string) => void
}

export default function SummaryTab({ userId, month, setMonth }: Props) {
  const [sub, setSub] = useState<SubPage>('overview')
  const [fixedEditing, setFixedEditing] = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([])

  useEffect(() => {
    fetchTransactions()
    fetchFixedExpenses()
  }, [month])

  async function fetchTransactions() {
    const from = `${month}-01`
    const to = `${month}-31`
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('date', from)
      .lte('date', to)
    setTransactions(data ?? [])
  }

  async function fetchFixedExpenses() {
    const { data } = await supabase
      .from('fixed_expenses')
      .select('*')
      .eq('user_id', userId)
      .order('status', { ascending: true })
    setFixedExpenses(data ?? [])
  }

  return (
    <div>
      {!fixedEditing && <MonthSwitcher month={month} setMonth={setMonth} />}

      {/* サブページ切り替え */}
      {!fixedEditing && (
        <div className="px-4 pt-3">
          <div className="flex rounded-xl bg-slate-100 p-1">
            {(['overview', 'fixed', 'goals'] as SubPage[]).map((page) => {
              const labels = { overview: '概要', fixed: '固定費', goals: '目標' }
              return (
                <button
                  key={page}
                  onClick={() => setSub(page)}
                  className={
                    'flex-1 py-2 rounded-lg text-xs font-semibold transition ' +
                    (sub === page ? 'bg-white shadow text-slate-800' : 'text-slate-400')
                  }
                >
                  {labels[page]}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="p-4 space-y-4">
        {sub === 'overview' && (
          <Overview transactions={transactions} month={month} fixedExpenses={fixedExpenses} />
        )}
        {sub === 'fixed' && (
          <FixedExpenseList
            userId={userId}
            fixedExpenses={fixedExpenses}
            reload={fetchFixedExpenses}
            onEditingChange={setFixedEditing}
          />
        )}
        {sub === 'goals' && (
          <div className="text-sm text-slate-400 py-8 text-center">目標機能は近日実装予定です</div>
        )}
      </div>
    </div>
  )
}

// ─── Overview ───────────────────────────────────────────────

function Overview({
  transactions,
  month,
  fixedExpenses,
}: {
  transactions: Transaction[]
  month: string
  fixedExpenses: FixedExpense[]
}) {
  const monthTx = transactions.filter((t) => monthKey(t.date) === month)
  const income = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const routineExpense = monthTx
    .filter((t) => t.type === 'expense' && t.expense_kind === 'routine')
    .reduce((s, t) => s + t.amount, 0)
  const oneTimeExpense = monthTx
    .filter((t) => t.type === 'expense' && t.expense_kind === 'one_time')
    .reduce((s, t) => s + t.amount, 0)
  const totalExpense = routineExpense + oneTimeExpense
  const balance = income - totalExpense

  const activeFixed = fixedExpenses.filter((f) => f.status !== 'cancelled')
  const totalFixed = activeFixed.reduce((s, f) => s + (f.amount ?? 0), 0)
  const totalBaseline = activeFixed.reduce((s, f) => s + f.baseline_amount, 0)
  const totalSaved = totalBaseline - totalFixed

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {}
    monthTx
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        map[t.category] = (map[t.category] || 0) + t.amount
      })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [monthTx])

  return (
    <>
      {/* 収支サマリー */}
      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-2.5">
        <div className="text-sm font-semibold text-slate-700">収支</div>
        <Row label="収入" value={formatYen(income)} valueColor="text-emerald-600" />
        <Row
          label="ルーチン費"
          value={`-${formatYen(routineExpense)}`}
          valueColor="text-rose-500"
        />
        <Row label="臨時費" value={`-${formatYen(oneTimeExpense)}`} valueColor="text-amber-500" />
        <div className="h-px bg-slate-100" />
        <Row
          label="収支"
          value={(balance >= 0 ? '+' : '') + formatYen(balance)}
          valueColor={balance >= 0 ? 'text-emerald-600' : 'text-rose-500'}
          bold
        />
      </div>

      {/* 節約進捗 */}
      {totalSaved > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="text-sm font-semibold text-slate-700 mb-1">固定費の節約効果</div>
          <div className="text-2xl font-bold text-emerald-600 mb-1">
            -{formatYen(totalSaved)}
            <span className="text-sm font-normal text-slate-400">/月</span>
          </div>
          <div className="text-xs text-slate-400">累計節約 {formatYen(totalSaved * 12)}/年換算</div>
        </div>
      )}

      {/* カテゴリ別支出 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="text-sm font-semibold text-slate-700 mb-3">カテゴリ別支出</div>
        {byCategory.length === 0 ? (
          <div className="text-sm text-slate-400">支出データがありません</div>
        ) : (
          <div className="space-y-3">
            {byCategory.map(([cat, amt]) => {
              const info = categoryInfo(cat)
              return (
                <div key={cat}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>
                      {info.icon} {cat}
                    </span>
                    <span className="text-slate-500">{formatYen(amt)}</span>
                  </div>
                  <ProgressBar ratio={totalExpense ? amt / totalExpense : 0} color={info.color} />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

function Row({
  label,
  value,
  valueColor,
  bold,
}: {
  label: string
  value: string
  valueColor: string
  bold?: boolean
}) {
  return (
    <div className="flex justify-between items-center">
      <span className={`text-sm ${bold ? 'font-semibold text-slate-700' : 'text-slate-500'}`}>
        {label}
      </span>
      <span className={`text-sm font-semibold ${valueColor}`}>{value}</span>
    </div>
  )
}

// ─── Fixed Expense List ──────────────────────────────────────

function FixedExpenseList({
  userId,
  fixedExpenses,
  reload,
  onEditingChange,
}: {
  userId: string
  fixedExpenses: FixedExpense[]
  reload: () => void
  onEditingChange: (editing: boolean) => void
}) {
  const [filter, setFilter] = useState<'active' | 'reviewing' | 'cancelled'>('active')
  const [editing, setEditing] = useState<FixedExpense | null | 'new'>(null)

  function openEditing(v: FixedExpense | 'new') {
    setEditing(v)
    onEditingChange(true)
  }
  function closeEditing() {
    setEditing(null)
    onEditingChange(false)
    reload()
  }
  const [seeding, setSeeding] = useState(false)

  // 初回のみデフォルト固定費を自動挿入
  useEffect(() => {
    if (fixedExpenses.length === 0 && !seeding) {
      setSeeding(true)
      const today = new Date().toISOString().slice(0, 10)
      const rows = DEFAULT_FIXED_EXPENSES.map((d) => ({
        user_id: userId,
        name: d.name,
        category: d.category,
        amount: null,
        baseline_amount: 0,
        cycle: d.cycle,
        status: 'active' as const,
        start_date: today,
      }))
      supabase
        .from('fixed_expenses')
        .insert(rows)
        .then(() => {
          reload()
          setSeeding(false)
        })
    }
  }, [fixedExpenses.length])

  const filtered = fixedExpenses.filter((f) => f.status === filter)
  const activeExpenses = fixedExpenses.filter((f) => f.status !== 'cancelled')
  const totalAmount = activeExpenses.reduce((s, f) => s + (f.amount ?? 0), 0)
  const totalBaseline = activeExpenses
    .filter((f) => f.baseline_amount > 0)
    .reduce((s, f) => s + f.baseline_amount, 0)
  const totalCurrent = activeExpenses
    .filter((f) => f.baseline_amount > 0)
    .reduce((s, f) => s + (f.amount ?? 0), 0)
  const totalSaved = totalBaseline - totalCurrent

  if (editing !== null) {
    return (
      <FixedExpenseForm
        userId={userId}
        expense={editing === 'new' ? undefined : editing}
        onClose={closeEditing}
      />
    )
  }

  return (
    <>
      {/* 節約サマリー */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="text-sm font-semibold text-slate-700 mb-3">節約サマリー</div>
        <Row
          label="固定費合計（月額）"
          value={formatYen(totalAmount)}
          valueColor="text-slate-700"
        />
        {totalSaved > 0 && (
          <>
            <div className="mt-2" />
            <Row
              label="初回登録時との差"
              value={`-${formatYen(totalSaved)}/月`}
              valueColor="text-emerald-600"
              bold
            />
            <div className="text-xs text-slate-400 mt-1">
              年間換算 -{formatYen(totalSaved * 12)}
            </div>
          </>
        )}
      </div>

      {/* フィルター */}
      <div className="flex rounded-xl bg-slate-100 p-1">
        {(['active', 'reviewing', 'cancelled'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={
              'flex-1 py-1.5 rounded-lg text-xs font-semibold transition ' +
              (filter === s ? 'bg-white shadow text-slate-800' : 'text-slate-400')
            }
          >
            {STATUS_LABELS[s].label}
          </button>
        ))}
      </div>

      {/* 固定費一覧 */}
      {seeding ? (
        <div className="text-sm text-slate-400 text-center py-6">読み込み中...</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm divide-y divide-slate-50">
          {filtered.length === 0 ? (
            <div className="text-sm text-slate-400 text-center py-6">
              該当する固定費がありません
            </div>
          ) : (
            filtered.map((f) => (
              <div
                key={f.id}
                className="flex items-center px-4 py-3 gap-3 active:bg-slate-50 cursor-pointer"
                onClick={() => openEditing(f)}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-700 truncate">{f.name}</div>
                  <div className="text-xs text-slate-400">{f.category}</div>
                </div>
                <div className="text-right shrink-0">
                  <div
                    className={`text-sm font-semibold ${f.amount == null ? 'text-slate-300' : 'text-slate-700'}`}
                  >
                    {f.amount == null ? '未入力' : formatYen(f.amount)}
                  </div>
                  {f.baseline_amount > 0 && f.amount != null && f.baseline_amount > f.amount && (
                    <div className="text-xs text-emerald-500">
                      -{formatYen(f.baseline_amount - f.amount)}
                    </div>
                  )}
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_LABELS[f.status].color}`}
                >
                  {STATUS_LABELS[f.status].label}
                </span>
                <span className="text-slate-300 text-sm">›</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* 追加ボタン */}
      <button
        onClick={() => openEditing('new')}
        className="w-full py-3 rounded-xl border-2 border-dashed border-slate-200 text-sm text-slate-400 font-semibold active:bg-slate-50"
      >
        + 固定費を追加
      </button>
    </>
  )
}

function FixedExpenseForm({
  userId,
  expense,
  onClose,
}: {
  userId?: string
  expense?: FixedExpense
  onClose: () => void
}) {
  const [name, setName] = useState(expense?.name ?? '')
  const [category, setCategory] = useState(expense?.category ?? FIXED_EXPENSE_CATEGORIES[0].name)
  const [amount, setAmount] = useState(expense?.amount != null ? expense.amount.toString() : '')
  const [cycle, setCycle] = useState<FixedExpense['cycle']>(expense?.cycle ?? 'monthly')
  const [status, setStatus] = useState<FixedExpense['status']>(expense?.status ?? 'active')
  const [notes, setNotes] = useState(expense?.notes ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    const amt = parseFloat(amount)
    if (!name || isNaN(amt) || amt < 0) return
    setSaving(true)
    if (expense) {
      await supabase
        .from('fixed_expenses')
        .update({ name, category, amount: amt, cycle, status, notes: notes || null })
        .eq('id', expense.id)
    } else {
      await supabase.from('fixed_expenses').insert({
        user_id: userId!,
        name,
        category,
        amount: amt,
        baseline_amount: amt,
        cycle,
        status,
        notes: notes || null,
        start_date: new Date().toISOString().slice(0, 10),
      })
    }
    setSaving(false)
    onClose()
  }

  async function remove() {
    if (!expense) return
    await supabase.from('fixed_expenses').delete().eq('id', expense.id)
    onClose()
  }

  return (
    <div className="space-y-4">
      {/* ページヘッダー */}
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
            {FIXED_EXPENSE_CATEGORIES.map((c) => (
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
              <option value="weekly">毎週</option>
              <option value="daily">毎日</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-400">ステータス</label>
          <div className="flex gap-2 mt-1">
            {(['active', 'reviewing', 'cancelled'] as const).map((s) => (
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
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder=""
            className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
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
