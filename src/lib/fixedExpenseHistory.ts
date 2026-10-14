import type {
  FixedExpense,
  FixedExpenseMonthlyRecord,
  FixedExpenseMonthlyRecordInsert,
} from './database.types'
import { getLoanPeriod, isActiveFixedExpense } from './loan'

// 年払い（ローンは毎月の分割払いなので除く）か
export function isYearlyPayment(
  f: Pick<FixedExpense, 'id' | 'category' | 'cycle' | 'loan_start_month' | 'loan_end_month'>
): boolean {
  return f.cycle === 'yearly' && !getLoanPeriod(f)
}

// 1回の支払額。履歴には月額換算ではなく実際に払う額を残す（年払いは年額、ローンは1回分）
export function paymentAmount(f: FixedExpense): number {
  const period = getLoanPeriod(f)
  return period ? (f.amount ?? 0) / period.installments : (f.amount ?? 0)
}

// その月に支払いがあるか。年払いは更新月だけで、更新月が未設定のものはどの月にも含めない
export function isPaidInMonth(f: FixedExpense, month: string): boolean {
  if (!isActiveFixedExpense(f, month)) return false
  if (!isYearlyPayment(f)) return true
  return f.renewal_month === Number(month.slice(5))
}

// 固定費の設定1件を、その月の記録行にする。
// 端数のわずかな差で同期が繰り返されないよう、記録時に円単位へ丸める
export function toMonthlyRecord(
  userId: string,
  f: FixedExpense,
  month: string
): FixedExpenseMonthlyRecordInsert {
  return {
    user_id: userId,
    month,
    fixed_expense_id: f.id,
    name: f.name,
    category: f.category,
    monthly_amount: Math.round(paymentAmount(f)),
  }
}

// その月に支払う固定費を記録行にする
export function buildMonthlySnapshot(
  userId: string,
  fixedExpenses: FixedExpense[],
  month: string
): FixedExpenseMonthlyRecordInsert[] {
  return fixedExpenses
    .filter((f) => isPaidInMonth(f, month))
    .map((f) => toMonthlyRecord(userId, f, month))
}

// 未来の月の見込み。DB には保存せず、現在の設定から計算した行を履歴と同じ形で返す
export function projectRecords(
  userId: string,
  fixedExpenses: FixedExpense[],
  months: string[]
): FixedExpenseMonthlyRecord[] {
  return months.flatMap((month) =>
    buildMonthlySnapshot(userId, fixedExpenses, month).map((row) => ({
      ...row,
      id: `projected:${month}:${row.fixed_expense_id}`,
      created_at: '',
    }))
  )
}

// 更新月が未設定のため履歴に含まれない年払い（契約中・見直し中のもの）
export function yearlyWithoutRenewalMonth(fixedExpenses: FixedExpense[]): FixedExpense[] {
  return fixedExpenses.filter(
    (f) => isActiveFixedExpense(f) && isYearlyPayment(f) && f.renewal_month == null
  )
}

// カテゴリ設定の順に並べる（設定にないカテゴリは最後）。同じカテゴリの中では元の順を保つ
export function sortByCategoryOrder<T extends { category: string }>(
  list: T[],
  categoryOrder: string[]
): T[] {
  const order = new Map(categoryOrder.map((name, i) => [name, i]))
  const rank = (c: string) => order.get(c) ?? categoryOrder.length
  return [...list].sort((a, b) => rank(a.category) - rank(b.category))
}

export type AddStatusFilter = 'all' | 'active' | 'unsubscribed' | 'cancelled'

// 追加シートのステータス絞り込み。固定費一覧と同じく「契約中」には見直し中も含める
export function matchesStatusFilter(
  f: Pick<FixedExpense, 'status'>,
  filter: AddStatusFilter
): boolean {
  if (filter === 'all') return true
  if (filter === 'active') return f.status === 'active' || f.status === 'reviewing'
  return f.status === filter
}

// 過去の月に手動で追加できる固定費（その月にまだ記録がない設定）
export function addableFixedExpenses(
  fixedExpenses: FixedExpense[],
  monthRecords: Pick<FixedExpenseMonthlyRecord, 'fixed_expense_id'>[]
): FixedExpense[] {
  const recorded = new Set(monthRecords.map((r) => r.fixed_expense_id))
  return fixedExpenses.filter((f) => !recorded.has(f.id))
}

export interface MonthlyRecordDiff {
  upserts: FixedExpenseMonthlyRecordInsert[]
  deleteIds: string[]
}

// 当月の記録を最新の設定に合わせるための差分
export function diffMonthlyRecords(
  existing: FixedExpenseMonthlyRecord[],
  snapshot: FixedExpenseMonthlyRecordInsert[]
): MonthlyRecordDiff {
  const existingById = new Map(
    existing.filter((r) => r.fixed_expense_id != null).map((r) => [r.fixed_expense_id, r])
  )
  const snapshotIds = new Set(snapshot.map((s) => s.fixed_expense_id))
  const upserts = snapshot.filter((s) => {
    const r = existingById.get(s.fixed_expense_id)
    return (
      !r ||
      r.name !== s.name ||
      r.category !== s.category ||
      Number(r.monthly_amount) !== s.monthly_amount
    )
  })
  const deleteIds = existing
    .filter((r) => r.fixed_expense_id == null || !snapshotIds.has(r.fixed_expense_id))
    .map((r) => r.id)
  return { upserts, deleteIds }
}

// 月ごとの固定費合計（記録がある月だけを含む）
export function fixedTotalsByMonth(
  records: Pick<FixedExpenseMonthlyRecord, 'month' | 'monthly_amount'>[]
): Map<string, number> {
  const totals = new Map<string, number>()
  for (const r of records) {
    totals.set(r.month, (totals.get(r.month) ?? 0) + Number(r.monthly_amount))
  }
  return totals
}

// yearly: 年払いの支払い月。毎年、更新月に「新規」、翌月に「終了」と出ないよう別に扱う
export type HistoryChange = 'new' | 'up' | 'down' | 'same' | 'ended' | 'yearly'

export interface HistoryItem {
  key: string
  // その月の記録行の id（前の月にだけある「終了」の項目は null）
  recordId: string | null
  name: string
  category: string
  amount: number
  // 比較する月の金額（比較する月がない、または新規のときは null）
  prevAmount: number | null
  change: HistoryChange
}

export interface MonthSummary {
  month: string
  total: number
  // 比較する月（記録がある直前の月）。最初の記録月は null
  prevMonth: string | null
  diff: number | null
  items: HistoryItem[]
}

// 削除された固定費は fixed_expense_id が null になるため、名前とカテゴリで月をまたいで突き合わせる
function itemKey(r: FixedExpenseMonthlyRecord): string {
  return r.fixed_expense_id ?? `${r.category}/${r.name}`
}

const CHANGE_ORDER: Record<HistoryChange, number> = {
  new: 0,
  up: 0,
  down: 0,
  same: 0,
  yearly: 0,
  ended: 1,
}

// 記録を月ごとにまとめ、記録がある直前の月と比べた変化を付ける（新しい月から順に返す）。
// yearlyIds は年払いの固定費の id。前の月になくても「新規」にせず、翌月に「終了」も出さない
export function summarizeHistory(
  records: FixedExpenseMonthlyRecord[],
  yearlyIds: ReadonlySet<string> = new Set()
): MonthSummary[] {
  const byMonth = new Map<string, FixedExpenseMonthlyRecord[]>()
  for (const r of records) {
    const list = byMonth.get(r.month) ?? []
    list.push(r)
    byMonth.set(r.month, list)
  }
  const months = [...byMonth.keys()].sort()

  const summaries = months.map((month, i) => {
    const current = byMonth.get(month) ?? []
    const prevMonth = i > 0 ? months[i - 1] : null
    const prevByKey = new Map(
      (prevMonth ? (byMonth.get(prevMonth) ?? []) : []).map((r) => [itemKey(r), r])
    )

    const items: HistoryItem[] = current.map((r) => {
      const amount = Number(r.monthly_amount)
      const prev = prevByKey.get(itemKey(r))
      const prevAmount = prev ? Number(prev.monthly_amount) : null
      let change: HistoryChange = 'same'
      if (r.fixed_expense_id != null && yearlyIds.has(r.fixed_expense_id) && prevAmount == null)
        change = 'yearly'
      else if (prevMonth && prevAmount == null) change = 'new'
      else if (prevAmount != null && amount > prevAmount) change = 'up'
      else if (prevAmount != null && amount < prevAmount) change = 'down'
      return {
        key: itemKey(r),
        recordId: r.id,
        name: r.name,
        category: r.category,
        amount,
        prevAmount,
        change,
      }
    })

    const currentKeys = new Set(items.map((it) => it.key))
    for (const [key, prev] of prevByKey) {
      if (currentKeys.has(key) || yearlyIds.has(key)) continue
      items.push({
        key,
        recordId: null,
        name: prev.name,
        category: prev.category,
        amount: 0,
        prevAmount: Number(prev.monthly_amount),
        change: 'ended',
      })
    }
    items.sort(
      (a, b) =>
        CHANGE_ORDER[a.change] - CHANGE_ORDER[b.change] ||
        b.amount - a.amount ||
        (b.prevAmount ?? 0) - (a.prevAmount ?? 0)
    )

    const total = items.reduce((s, it) => s + it.amount, 0)
    const prevTotal = prevMonth
      ? (byMonth.get(prevMonth) ?? []).reduce((s, r) => s + Number(r.monthly_amount), 0)
      : null
    return {
      month,
      total,
      prevMonth,
      diff: prevTotal == null ? null : total - prevTotal,
      items,
    }
  })

  return summaries.reverse()
}
