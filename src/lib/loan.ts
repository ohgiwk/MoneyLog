import type { FixedExpense } from './database.types'
import { getLoanMeta } from './loanMeta'
import { shiftMonth, todayStr } from '../utils'

export const LOAN_CATEGORY = 'ローン'

export function currentMonthStr(): string {
  return todayStr().slice(0, 7)
}

// from から to までの月数差（to - from）
export function monthDiff(from: string, to: string): number {
  const [fy, fm] = from.split('-').map(Number)
  const [ty, tm] = to.split('-').map(Number)
  return (ty - fy) * 12 + (tm - fm)
}

// 開始月と分割回数から終了月（最終支払月）を求める
export function loanEndMonth(startMonth: string, installments: number): string {
  return shiftMonth(startMonth, installments - 1)
}

// 開始月と終了月から分割回数を求める
export function loanInstallments(startMonth: string, endMonth: string): number {
  return monthDiff(startMonth, endMonth) + 1
}

type LoanFields = Pick<FixedExpense, 'id' | 'category' | 'loan_start_month' | 'loan_end_month'>

export interface LoanPeriod {
  startMonth: string
  endMonth: string
  installments: number
}

// 固定費のローン期間を取得する（DB未同期の旧データは localStorage から補完）
export function getLoanPeriod(f: LoanFields): LoanPeriod | null {
  if (f.category !== LOAN_CATEGORY) return null
  const meta = getLoanMeta(f.id)
  const startMonth = f.loan_start_month ?? meta?.startMonth
  const endMonth = f.loan_end_month ?? meta?.endMonth
  if (!startMonth || !endMonth) return null
  const installments = loanInstallments(startMonth, endMonth)
  if (installments < 1) return null
  return { startMonth, endMonth, installments }
}

export interface LoanProgress {
  paidCount: number
  remainingCount: number
  remainingAmount: number
}

// 当月分を含めて残り回数・残額を計算する（totalAmount はローン総額）
export function loanProgress(
  period: LoanPeriod,
  totalAmount: number,
  month: string = currentMonthStr()
): LoanProgress {
  const paidCount = Math.min(Math.max(monthDiff(period.startMonth, month), 0), period.installments)
  const remainingCount = period.installments - paidCount
  const remainingAmount = Math.round((totalAmount * remainingCount) / period.installments)
  return { paidCount, remainingCount, remainingAmount }
}

// 固定費の月額換算。ローンは金額を総額として分割回数で割り、それ以外はサイクルで換算する
export function toMonthlyAmount(
  f: LoanFields & Pick<FixedExpense, 'cycle'>,
  amount: number | null
): number {
  const period = getLoanPeriod(f)
  if (period) return (amount ?? 0) / period.installments
  return (amount ?? 0) / (f.cycle === 'yearly' ? 12 : 1)
}

// 終了月を過ぎたローンか
export function isLoanFinished(f: LoanFields, month: string = currentMonthStr()): boolean {
  const period = getLoanPeriod(f)
  return period != null && period.endMonth < month
}

// 固定費合計に含める対象（契約中・見直し中で、完済済みのローンを除く）
export function isActiveFixedExpense(
  f: LoanFields & Pick<FixedExpense, 'status'>,
  month: string = currentMonthStr()
): boolean {
  return (f.status === 'active' || f.status === 'reviewing') && !isLoanFinished(f, month)
}
