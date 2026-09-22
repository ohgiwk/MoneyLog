const LOAN_META_KEY = 'moneylog_loan_meta'

export interface LoanMeta {
  startMonth: string // YYYY-MM
  endMonth: string // YYYY-MM
}

type LoanMetaMap = Record<string, LoanMeta>

function getMap(): LoanMetaMap {
  try {
    return JSON.parse(localStorage.getItem(LOAN_META_KEY) ?? '{}')
  } catch {
    return {}
  }
}

export function getLoanMeta(expenseId: string): LoanMeta | null {
  return getMap()[expenseId] ?? null
}

export function setLoanMeta(expenseId: string, meta: LoanMeta): void {
  const map = getMap()
  map[expenseId] = meta
  localStorage.setItem(LOAN_META_KEY, JSON.stringify(map))
}

export function removeLoanMeta(expenseId: string): void {
  const map = getMap()
  delete map[expenseId]
  localStorage.setItem(LOAN_META_KEY, JSON.stringify(map))
}
