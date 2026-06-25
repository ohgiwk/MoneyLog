import { useEffect, useState, type FormEvent } from 'react'
import {
  CONSUMABLE_CATEGORIES,
  CONSUMABLE_CYCLE_PRESETS,
  STATUS_LABELS,
  SUBSCRIPTION_PRESETS,
  SUBSCRIPTION_SUBCATEGORIES,
  type CategoryInfo,
} from '../constants'
import { transactionService } from '../lib/services/transactionService'
import { fixedExpenseService } from '../lib/services/fixedExpenseService'
import { consumableService } from '../lib/services/consumableService'
import { profileService } from '../lib/services/profileService'
import type { Consumable, FixedExpense } from '../lib/database.types'
import { formatYen, todayStr } from '../utils'
import FixedExpenseTutorial from './FixedExpenseTutorial'

type RecordSubPage = 'one_time' | 'fixed' | 'consumables'

function effectiveCycleDays(c: Consumable, householdMembers: number): number {
  return c.members_scale ? Math.ceil(c.cycle_days / householdMembers) : c.cycle_days
}

function nextPurchaseDate(c: Consumable, householdMembers: number): Date {
  const base = new Date(c.last_purchased)
  base.setDate(base.getDate() + effectiveCycleDays(c, householdMembers))
  return base
}

function monthlyConsumableCost(c: Consumable, householdMembers: number): number {
  const cycle = effectiveCycleDays(c, householdMembers)
  return Math.round((c.amount * c.quantity) / (cycle / 30))
}

function daysUntil(date: Date): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((date.getTime() - today.getTime()) / 86400000)
}

interface Props {
  userId: string
  expenseCategories: CategoryInfo[]
  incomeCategories: CategoryInfo[]
  fixedCategories: CategoryInfo[]
}

export default function RecordTab({ userId, expenseCategories, incomeCategories, fixedCategories }: Props) {
  const [sub, setSub] = useState<RecordSubPage>('one_time')
  const [fixedEditing, setFixedEditing] = useState(false)
  const [consumableEditing, setConsumableEditing] = useState(false)
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([])
  const [consumables, setConsumables] = useState<Consumable[]>([])
  const [householdMembers, setHouseholdMembers] = useState(1)

  // 臨時出費フォーム state
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [date, setDate] = useState(todayStr())
  const [category, setCategory] = useState(expenseCategories[0]?.name ?? '')
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const formCategories = type === 'expense' ? expenseCategories : incomeCategories

  useEffect(() => {
    setCategory(formCategories[0]?.name ?? '')
  }, [type, expenseCategories, incomeCategories])

  useEffect(() => {
    fetchFixedExpenses()
    fetchConsumables()
    fetchProfile()
  }, [userId])

  async function fetchFixedExpenses() {
    const data = await fixedExpenseService.fetchByUser(userId)
    setFixedExpenses(data)
  }
  async function fetchConsumables() {
    const data = await consumableService.fetchByUser(userId)
    setConsumables(data)
  }
  async function fetchProfile() {
    const profile = await profileService.fetchById(userId)
    if (profile) setHouseholdMembers(profile.household_members ?? 1)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return
    setSubmitting(true)
    await transactionService.insert({
      user_id: userId,
      type,
      expense_kind: type === 'expense' ? 'one_time' : null,
      date,
      category,
      amount: amt,
      memo: memo.trim() || null,
      recurring_rule_id: null,
    })
    setAmount('')
    setMemo('')
    setSubmitting(false)
  }

  const isEditing = fixedEditing || consumableEditing

  return (
    <div>
      {/* タブ切り替え */}
      {!isEditing && (
        <div className="px-4 pt-4">
          <div className="flex rounded-xl bg-slate-100 p-1">
            {(['one_time', 'fixed', 'consumables'] as RecordSubPage[]).map((page) => {
              const labels = { one_time: '臨時出費', fixed: '固定費', consumables: '消耗品費' }
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
        {sub === 'one_time' && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            {/* 収支トグル */}
            <div className="flex rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setType('expense')}
                className={
                  'flex-1 py-2 rounded-lg text-sm font-semibold transition ' +
                  (type === 'expense' ? 'bg-rose-500 text-white shadow' : 'text-slate-500')
                }
              >
                支出
              </button>
              <button
                type="button"
                onClick={() => setType('income')}
                className={
                  'flex-1 py-2 rounded-lg text-sm font-semibold transition ' +
                  (type === 'income' ? 'bg-emerald-500 text-white shadow' : 'text-slate-500')
                }
              >
                収入
              </button>
            </div>

            {/* 日付 */}
            <div>
              <label className="text-xs text-slate-400">日付</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>

            {/* カテゴリ */}
            <div>
              <label className="text-xs text-slate-400">カテゴリ</label>
              <div className="grid grid-cols-5 gap-2 mt-1">
                {formCategories.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setCategory(c.name)}
                    className={
                      'flex flex-col items-center justify-center py-2 rounded-xl text-xs gap-1 border ' +
                      (category === c.name
                        ? 'border-emerald-400 bg-emerald-50'
                        : 'border-slate-100 bg-slate-50')
                    }
                  >
                    <span className="text-lg">{c.icon}</span>
                    <span className="text-[10px] leading-tight text-slate-600 text-center">
                      {c.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 金額 */}
            <div>
              <label className="text-xs text-slate-400">金額</label>
              <input
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>

            {/* メモ */}
            <div>
              <label className="text-xs text-slate-400">メモ（任意）</label>
              <input
                type="text"
                placeholder="例: スーパーで買い物"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={
                'w-full py-3 rounded-xl text-white font-semibold shadow disabled:opacity-50 ' +
                (type === 'expense'
                  ? 'bg-rose-500 active:bg-rose-600'
                  : 'bg-emerald-500 active:bg-emerald-600')
              }
            >
              記録する
            </button>
          </form>
        )}

        {sub === 'fixed' && (
          <FixedExpenseList
            userId={userId}
            fixedExpenses={fixedExpenses}
            fixedCategories={fixedCategories}
            reload={fetchFixedExpenses}
            onEditingChange={setFixedEditing}
          />
        )}

        {sub === 'consumables' && (
          <ConsumablesList
            userId={userId}
            consumables={consumables}
            householdMembers={householdMembers}
            reload={fetchConsumables}
            onEditingChange={setConsumableEditing}
          />
        )}
      </div>
    </div>
  )
}

// ─── Fixed Expense List ──────────────────────────────────────

function FixedExpenseList({
  userId,
  fixedExpenses,
  fixedCategories,
  reload,
  onEditingChange,
}: {
  userId: string
  fixedExpenses: FixedExpense[]
  fixedCategories: CategoryInfo[]
  reload: () => void
  onEditingChange: (editing: boolean) => void
}) {
  const [filter, setFilter] = useState<FixedExpense['status']>('active')
  const [editing, setEditing] = useState<FixedExpense | null | 'new'>(null)
  const [tutorialOpen, setTutorialOpen] = useState(false)

  function openEditing(v: FixedExpense | 'new') {
    setEditing(v)
    onEditingChange(true)
  }
  function closeEditing() {
    setEditing(null)
    onEditingChange(false)
    reload()
  }

  const categoryOrder = fixedCategories.map((c) => c.name)
  const sortByCategory = (a: FixedExpense, b: FixedExpense) => {
    const ai = categoryOrder.indexOf(a.category)
    const bi = categoryOrder.indexOf(b.category)
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
  }
  const filtered = fixedExpenses.filter((f) => f.status === filter).sort(sortByCategory)
  const activeExpenses = fixedExpenses.filter((f) => f.status === 'active' || f.status === 'reviewing')
  const toMonthly = (f: FixedExpense) => (f.amount ?? 0) / (f.cycle === 'yearly' ? 12 : 1)
  const totalAmount = activeExpenses.reduce((s, f) => s + toMonthly(f), 0)
  const totalBaseline = activeExpenses
    .filter((f) => f.baseline_amount > 0)
    .reduce((s, f) => s + f.baseline_amount / (f.cycle === 'yearly' ? 12 : 1), 0)
  const totalCurrent = activeExpenses
    .filter((f) => f.baseline_amount > 0)
    .reduce((s, f) => s + toMonthly(f), 0)
  const totalSaved = totalBaseline - totalCurrent

  if (editing !== null) {
    return (
      <FixedExpenseForm
        userId={userId}
        expense={editing === 'new' ? undefined : editing}
        fixedCategories={fixedCategories}
        onClose={closeEditing}
      />
    )
  }

  return (
    <>
      {tutorialOpen && (
        <FixedExpenseTutorial
          userId={userId}
          fixedExpenses={fixedExpenses}
          onClose={() => setTutorialOpen(false)}
          onComplete={() => { setTutorialOpen(false); reload() }}
        />
      )}

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
        {(['active', 'reviewing', 'unsubscribed', 'cancelled'] as const).map((s) => (
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
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-sm text-slate-400 text-center py-6">
            該当する固定費がありません
          </div>
        ) : (
          (() => {
            const rows: import('react').ReactNode[] = []
            let prevCategory = ''
            filtered.forEach((f, i) => {
              if (f.category !== prevCategory) {
                const cat = fixedCategories.find((c) => c.name === f.category)
                rows.push(
                  <div
                    key={`header-${f.category}`}
                    className={`flex items-center gap-2 px-4 py-1.5 bg-slate-50 ${i > 0 ? 'border-t border-slate-100' : ''}`}
                  >
                    {cat && <span className="text-sm">{cat.icon}</span>}
                    <span className="text-xs font-semibold text-slate-400">{f.category}</span>
                  </div>
                )
                prevCategory = f.category
              }
              rows.push(
                <div
                  key={f.id}
                  className="flex items-center px-4 py-3 gap-3 active:bg-slate-50 cursor-pointer border-t border-slate-50"
                  onClick={() => openEditing(f)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-700 truncate">{f.name}</div>
                    {f.cycle === 'yearly' && (
                      <div className="text-xs text-indigo-400 font-medium">年払い</div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div
                      className={`text-sm font-semibold ${f.amount == null ? 'text-slate-300' : 'text-slate-700'}`}
                    >
                      {f.amount == null
                        ? '未入力'
                        : f.cycle === 'yearly'
                          ? `${formatYen(f.amount)}/年`
                          : formatYen(f.amount)}
                    </div>
                    {f.cycle === 'yearly' && f.amount != null && (
                      <div className="text-xs text-slate-400">
                        月換算 {formatYen(Math.round(f.amount / 12))}
                      </div>
                    )}
                    {f.cycle !== 'yearly' && f.baseline_amount > 0 && f.amount != null && f.baseline_amount > f.amount && (
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
              )
            })
            return rows
          })()
        )}
      </div>

      {/* 追加・チュートリアルボタン */}
      <button
        onClick={() => openEditing('new')}
        className="w-full py-3 rounded-xl border-2 border-dashed border-slate-200 text-sm text-slate-400 font-semibold active:bg-slate-50"
      >
        + 固定費を追加
      </button>
      <button
        onClick={() => setTutorialOpen(true)}
        className="w-full py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-500 font-medium active:bg-slate-50 flex items-center justify-center gap-2"
      >
        <span>🧭</span> 初期設定ウィザードを起動
      </button>
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

// ─── Consumables List ────────────────────────────────────────

function ConsumablesList({
  userId,
  consumables,
  householdMembers,
  reload,
  onEditingChange,
}: {
  userId: string
  consumables: Consumable[]
  householdMembers: number
  reload: () => void
  onEditingChange: (editing: boolean) => void
}) {
  const [editing, setEditing] = useState<Consumable | null | 'new'>(null)

  function openEditing(v: Consumable | 'new') {
    setEditing(v)
    onEditingChange(true)
  }
  function closeEditing() {
    setEditing(null)
    onEditingChange(false)
    reload()
  }

  const sorted = [...consumables].sort(
    (a, b) =>
      nextPurchaseDate(a, householdMembers).getTime() -
      nextPurchaseDate(b, householdMembers).getTime(),
  )
  const urgent = sorted.filter((c) => daysUntil(nextPurchaseDate(c, householdMembers)) <= 7)
  const rest = sorted.filter((c) => daysUntil(nextPurchaseDate(c, householdMembers)) > 7)

  const totalMonthly = consumables.reduce(
    (s, c) => s + monthlyConsumableCost(c, householdMembers),
    0,
  )

  if (editing !== null) {
    return (
      <ConsumableForm
        userId={userId}
        consumable={editing === 'new' ? undefined : editing}
        householdMembers={householdMembers}
        onClose={closeEditing}
      />
    )
  }

  return (
    <>
      {/* 月額コストサマリー */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="text-sm font-semibold text-slate-700 mb-1">消耗品費（月額換算）</div>
        <div className="text-2xl font-bold text-slate-700">
          {formatYen(totalMonthly)}
          <span className="text-sm font-normal text-slate-400">/月</span>
        </div>
        <div className="text-xs text-slate-400 mt-1">同居人数: {householdMembers}人</div>
      </div>

      {/* そろそろ買い時 */}
      {urgent.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-amber-600 mb-2 flex items-center gap-1">
            <span>⚠️</span> そろそろ買い時（7日以内）
          </div>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {urgent.map((c, i) => (
              <ConsumableRow
                key={c.id}
                consumable={c}
                householdMembers={householdMembers}
                onClick={() => openEditing(c)}
                border={i > 0}
                urgent
              />
            ))}
          </div>
        </div>
      )}

      {/* すべての品目 */}
      {rest.length > 0 && (
        <div>
          {urgent.length > 0 && (
            <div className="text-xs font-semibold text-slate-400 mb-2">その他の品目</div>
          )}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {rest.map((c, i) => (
              <ConsumableRow
                key={c.id}
                consumable={c}
                householdMembers={householdMembers}
                onClick={() => openEditing(c)}
                border={i > 0}
              />
            ))}
          </div>
        </div>
      )}

      {consumables.length === 0 && (
        <div className="text-sm text-slate-400 text-center py-4">
          登録された消耗品がありません
        </div>
      )}

      <button
        onClick={() => openEditing('new')}
        className="w-full py-3 rounded-xl border-2 border-dashed border-slate-200 text-sm text-slate-400 font-semibold active:bg-slate-50"
      >
        + 消耗品を追加
      </button>
    </>
  )
}

function ConsumableRow({
  consumable: c,
  householdMembers,
  onClick,
  border,
  urgent,
}: {
  consumable: Consumable
  householdMembers: number
  onClick: () => void
  border: boolean
  urgent?: boolean
}) {
  const next = nextPurchaseDate(c, householdMembers)
  const days = daysUntil(next)
  const monthly = monthlyConsumableCost(c, householdMembers)
  const cat = CONSUMABLE_CATEGORIES.find((cat) => cat.name === c.category)

  const daysLabel =
    days < 0
      ? `${Math.abs(days)}日超過`
      : days === 0
        ? '今日'
        : days === 1
          ? '明日'
          : `${days}日後`

  const daysColor =
    days < 0
      ? 'text-rose-500'
      : days <= 3
        ? 'text-rose-400'
        : days <= 7
          ? 'text-amber-500'
          : 'text-slate-400'

  return (
    <div
      className={`flex items-center px-4 py-3 gap-3 active:bg-slate-50 cursor-pointer ${border ? 'border-t border-slate-50' : ''} ${urgent ? 'bg-amber-50/40' : ''}`}
      onClick={onClick}
    >
      <span className="text-xl shrink-0">{cat?.icon ?? '📦'}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-700 truncate">{c.name}</div>
        <div className="text-xs text-slate-400">
          {formatYen(c.amount)}
          {c.quantity > 1 ? ` × ${c.quantity}個` : ''} / {c.cycle_days}日サイクル
          {c.members_scale ? ` (${householdMembers}人)` : ''}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className={`text-xs font-semibold ${daysColor}`}>
          {next.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })} ({daysLabel})
        </div>
        <div className="text-xs text-slate-400">{formatYen(monthly)}/月</div>
      </div>
      <span className="text-slate-300 text-sm">›</span>
    </div>
  )
}

// ─── Consumable Form ─────────────────────────────────────────

function ConsumableForm({
  userId,
  consumable,
  householdMembers,
  onClose,
}: {
  userId: string
  consumable?: Consumable
  householdMembers: number
  onClose: () => void
}) {
  const [name, setName] = useState(consumable?.name ?? '')
  const [category, setCategory] = useState(consumable?.category ?? CONSUMABLE_CATEGORIES[0].name)
  const [amount, setAmount] = useState(consumable?.amount.toString() ?? '')
  const [quantity, setQuantity] = useState(consumable?.quantity.toString() ?? '1')
  const [cycleDays, setCycleDays] = useState(consumable?.cycle_days.toString() ?? '30')
  const [membersScale, setMembersScale] = useState(consumable?.members_scale ?? false)
  const [lastPurchased, setLastPurchased] = useState(
    consumable?.last_purchased ?? new Date().toISOString().slice(0, 10),
  )
  const [notes, setNotes] = useState(consumable?.notes ?? '')
  const [saving, setSaving] = useState(false)

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
    setSaving(false)
    onClose()
  }

  async function remove() {
    if (!consumable) return
    await consumableService.delete(consumable.id)
    onClose()
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
                ? `有効（${householdMembers}人 → 実効${previewCycle}日おき）`
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
            <div className="font-semibold text-slate-700">月額換算: {formatYen(previewMonthly)}</div>
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

function FixedExpenseForm({
  userId,
  expense,
  fixedCategories,
  onClose,
}: {
  userId?: string
  expense?: FixedExpense
  fixedCategories: CategoryInfo[]
  onClose: () => void
}) {
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

  async function save() {
    const amt = parseFloat(amount)
    if (!name || isNaN(amt) || amt < 0) return
    setSaving(true)
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
    setSaving(false)
    onClose()
  }

  async function remove() {
    if (!expense) return
    await fixedExpenseService.delete(expense.id)
    onClose()
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
