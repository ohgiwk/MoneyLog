import { useEffect, useMemo, useState } from 'react'
import type { CategoryInfo } from '../constants'
import { transactionService } from '../lib/services/transactionService'
import { fixedExpenseService } from '../lib/services/fixedExpenseService'
import type { FixedExpense, Transaction } from '../lib/database.types'
import { categoryInfo, formatYen, monthKey, monthLabel } from '../utils'
import MonthSwitcher from './ui/MonthSwitcher'
import { TabGroup } from './ui/TabGroup'
import { Row } from './ui/Row'

type SubPage = 'overview' | 'detail'

const SUB_PAGE_TABS: { key: SubPage; label: string }[] = [
  { key: 'overview', label: '概要' },
  { key: 'detail', label: '詳細' },
]

interface Props {
  userId: string
  month: string
  setMonth: (m: string) => void
  fixedCategories: CategoryInfo[]
}

export default function SummaryTab({ userId, month, setMonth }: Props) {
  const [sub, setSub] = useState<SubPage>('overview')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([])
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setFetchError(null)
      try {
        const [txs, fixed] = await Promise.all([
          transactionService.fetchByMonth(userId, month),
          fixedExpenseService.fetchByUser(userId),
        ])
        setTransactions(txs)
        setFixedExpenses(fixed)
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : 'データの読み込みに失敗しました')
      }
    }
    void load()
  }, [month, userId])

  async function deleteTx(id: string) {
    try {
      await transactionService.delete(id)
      setTransactions((prev) => prev.filter((t) => t.id !== id))
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : '削除に失敗しました')
    }
  }

  return (
    <div>
      <MonthSwitcher month={month} setMonth={setMonth} />

      {/* 概要/詳細 切り替え */}
      <div className="px-4 pt-3">
        <TabGroup tabs={SUB_PAGE_TABS} active={sub} onChange={setSub} />
      </div>

      {fetchError && (
        <div className="mx-4 mt-3 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-600">
          {fetchError}
        </div>
      )}

      <div className="p-4 space-y-4">
        {sub === 'overview' && (
          <Overview transactions={transactions} month={month} fixedExpenses={fixedExpenses} />
        )}
        {sub === 'detail' && (
          <DetailView transactions={transactions} month={month} onDeleteTx={deleteTx} />
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
  const monthTx = useMemo(
    () => transactions.filter((t) => monthKey(t.date) === month),
    [transactions, month]
  )
  const income = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const routineExpense = monthTx
    .filter(
      (t) =>
        t.type === 'expense' && (t.expense_kind === 'routine' || t.expense_kind === 'consumable')
    )
    .reduce((s, t) => s + t.amount, 0)
  const oneTimeExpense = monthTx
    .filter((t) => t.type === 'expense' && t.expense_kind === 'one_time')
    .reduce((s, t) => s + t.amount, 0)

  const activeFixed = fixedExpenses.filter((f) => f.status === 'active' || f.status === 'reviewing')
  const toMonthly = (f: FixedExpense) => (f.amount ?? 0) / (f.cycle === 'yearly' ? 12 : 1)
  const totalFixed = activeFixed.reduce((s, f) => s + toMonthly(f), 0)
  const totalBaseline = activeFixed.reduce(
    (s, f) => s + f.baseline_amount / (f.cycle === 'yearly' ? 12 : 1),
    0
  )
  const totalSaved = totalBaseline - totalFixed

  const totalExpense = routineExpense + oneTimeExpense
  const balance = income - totalFixed - totalExpense

  return (
    <>
      {/* 収支サマリー */}
      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-2.5">
        <div className="text-sm font-semibold text-slate-700">収支</div>
        <Row label="収入" value={formatYen(income)} valueColor="text-emerald-600" />
        <Row
          label="固定費"
          value={`-${formatYen(Math.round(totalFixed))}`}
          valueColor="text-slate-500"
        />
        <Row label="消耗品費" value={`-${formatYen(routineExpense)}`} valueColor="text-rose-500" />
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
            -{formatYen(Math.round(totalSaved))}
            <span className="text-sm font-normal text-slate-400">/月</span>
          </div>
          <div className="text-xs text-slate-400">
            累計節約 {formatYen(Math.round(totalSaved * 12))}/年換算
          </div>
        </div>
      )}
    </>
  )
}

// ─── Detail View ─────────────────────────────────────────────

function DetailView({
  transactions,
  month,
  onDeleteTx,
}: {
  transactions: Transaction[]
  month: string
  onDeleteTx: (id: string) => void
}) {
  const monthTx = useMemo(
    () => transactions.filter((t) => monthKey(t.date) === month),
    [transactions, month]
  )

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
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="text-sm font-semibold text-slate-700 mb-3">{monthLabel(month)}の記録</div>
      {grouped.length === 0 && <div className="text-sm text-slate-400 py-2">記録がありません</div>}
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
                          className="text-slate-300 active:text-rose-400 text-sm px-1"
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
  )
}
