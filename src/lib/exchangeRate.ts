const RATE_KEY = 'moneylog_usd_jpy_rate'
const CURRENCY_META_KEY = 'moneylog_expense_currency'

export const DEFAULT_USD_JPY_RATE = 150

export function getUsdJpyRate(): number {
  const v = localStorage.getItem(RATE_KEY)
  return v ? parseFloat(v) : DEFAULT_USD_JPY_RATE
}

export function setUsdJpyRate(rate: number): void {
  localStorage.setItem(RATE_KEY, rate.toString())
}

interface CurrencyMeta {
  currency: 'USD'
  usdAmount: number
}

type CurrencyMetaMap = Record<string, CurrencyMeta>

function getCurrencyMetaMap(): CurrencyMetaMap {
  try {
    return JSON.parse(localStorage.getItem(CURRENCY_META_KEY) ?? '{}')
  } catch {
    return {}
  }
}

export function setExpenseCurrencyMeta(expenseId: string, meta: CurrencyMeta): void {
  const map = getCurrencyMetaMap()
  map[expenseId] = meta
  localStorage.setItem(CURRENCY_META_KEY, JSON.stringify(map))
}

export function removeExpenseCurrencyMeta(expenseId: string): void {
  const map = getCurrencyMetaMap()
  delete map[expenseId]
  localStorage.setItem(CURRENCY_META_KEY, JSON.stringify(map))
}

export function getExpenseCurrencyMeta(expenseId: string): CurrencyMeta | null {
  return getCurrencyMetaMap()[expenseId] ?? null
}

export function getAllCurrencyMeta(): CurrencyMetaMap {
  return getCurrencyMetaMap()
}
