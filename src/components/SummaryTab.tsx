import { useEffect, useMemo, useState } from 'react'
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
import type { Consumable, FixedExpense, Transaction } from '../lib/database.types'
import { categoryInfo, formatYen, monthKey, monthLabel } from '../utils'
import MonthSwitcher from './ui/MonthSwitcher'
import ProgressBar from './ui/ProgressBar'
import FixedExpenseTutorial from './FixedExpenseTutorial'

type SubPage = 'overview' | 'fixed' | 'consumables'

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
  month: string
  setMonth: (m: string) => void
  fixedCategories: CategoryInfo[]
}

export default function SummaryTab({ userId, month, setMonth, fixedCategories }: Props) {
  const [sub, setSub] = useState<SubPage>('overview')
  const [fixedEditing, setFixedEditing] = useState(false)
  const [consumableEditing, setConsumableEditing] = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([])
  const [consumables, setConsumables] = useState<Consumable[]>([])
  const [householdMembers, setHouseholdMembers] = useState(1)

  useEffect(() => {
    fetchTransactions()
    fetchFixedExpenses()
    fetchConsumables()
    fetchProfile()
  }, [month])

  async function fetchTransactions() {
    const data = await transactionService.fetchByMonth(userId, month)
    setTransactions(data)
  }
  async function deleteTx(id: string) {
    await transactionService.delete(id)
    setTransactions((prev) => prev.filter((t) => t.id !== id))
  }
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

  const isEditing = fixedEditing || consumableEditing

  return (
    <div>
      {!isEditing && <MonthSwitcher month={month} setMonth={setMonth} />}

      {/* サブページ切り替え */}
      {!isEditing && (
        <div className="px-4 pt-3">
          <div className="flex rounded-xl bg-slate-100 p-1">
            {(['overview', 'fixed', 'consumables'] as SubPage[]).map((page) => {
              const labels = { overview: '概要', fixed: '固定費', consumables: '消耗品費' }
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
          <Overview transactions={transactions} month={month} fixedExpenses={fixedExpenses} onDeleteTx={deleteTx} />
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

// ─── Overview ───────────────────────────────────────────────

function Overview({
  transactions,
  month,
  fixedExpenses,
  onDeleteTx,
}: {
  transactions: Transaction[]
  month: string
  fixedExpenses: FixedExpense[]
  onDeleteTx: (id: string) => void
}) {
  const monthTx = transactions.filter((t) => monthKey(t.date) === month)
  const income = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const routineExpense = monthTx
    .filter((t) => t.type === 'expense' && (t.expense_kind === 'routine' || t.expense_kind === 'consumable'))
    .reduce((s, t) => s + t.amount, 0)
  const oneTimeExpense = monthTx
    .filter((t) => t.type === 'expense' && t.expense_kind === 'one_time')
    .reduce((s, t) => s + t.amount, 0)
  const totalExpense = routineExpense + oneTimeExpense
  const balance = income - totalExpense

  const activeFixed = fixedExpenses.filter((f) => f.status === 'active' || f.status === 'reviewing')
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

  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    for (const t of monthTx) {
      const arr = map.get(t.date) ?? []
      arr.push(t)
      map.set(t.date, arr)
    }
    return [...map.entries()].sort(([a], [b]) => (a < b ? 1 : -1))
  }, [monthTx])

  return (
    <>
      {/* 収支サマリー */}
      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-2.5">
        <div className="text-sm font-semibold text-slate-700">収支</div>
        <Row label="収入" value={formatYen(income)} valueColor="text-emerald-600" />
        <Row
          label="消耗品費"
          value={`-${formatYen(routineExpense)}`}
          valueColor="text-rose-500"
        />
        <Row label="臨時出費" value={`-${formatYen(oneTimeExpense)}`} valueColor="text-amber-500" />
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

      {/* 記録一覧 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="text-sm font-semibold text-slate-700 mb-3">{monthLabel(month)}の記録</div>
        {grouped.length === 0 && (
          <div className="text-sm text-slate-400 py-2">記録がありません</div>
        )}
        <div className="space-y-4">
          {grouped.map(([date, txs]) => {
            const dayExpense = txs
              .filter((t) => t.type === 'expense')
              .reduce((s, t) => s + t.amount, 0)
            return (
              <div key={date}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-slate-500">{date}</span>
                  {dayExpense > 0 && (
                    <span className="text-xs text-rose-400">{formatYen(dayExpense)}</span>
                  )}
                </div>
                <div className="space-y-1.5">
                  {txs.map((t) => {
                    const info = categoryInfo(t.category)
                    return (
                      <div
                        key={t.id}
                        className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">{info.icon}</span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm text-slate-700">{t.category}</span>
                              {t.expense_kind === 'one_time' && (
                                <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full">
                                  臨時出費
                                </span>
                              )}
                            </div>
                            {t.memo && <div className="text-xs text-slate-400">{t.memo}</div>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              'text-sm font-semibold ' +
                              (t.type === 'income' ? 'text-emerald-600' : 'text-rose-500')
                            }
                          >
                            {t.type === 'income' ? '+' : '-'}
                            {formatYen(t.amount)}
                          </span>
                          <button
                            onClick={() => onDeleteTx(t.id)}
                            className="text-slate-200 active:text-rose-400 text-sm px-1"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
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
