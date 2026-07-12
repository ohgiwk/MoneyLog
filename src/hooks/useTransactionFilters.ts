import { useMemo, useState } from 'react'
import type { Transaction } from '../lib/database.types'
import { periodKey } from '../utils'

interface ControlledDateRange {
  dateFrom: string
  setDateFrom: (v: string) => void
  dateTo: string
  setDateTo: (v: string) => void
}

export function useTransactionFilters(
  transactions: Transaction[],
  month: string,
  startDay = 1,
  controlledDateRange?: ControlledDateRange
) {
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [internalDateFrom, setInternalDateFrom] = useState<string>('')
  const [internalDateTo, setInternalDateTo] = useState<string>('')
  const dateFrom = controlledDateRange?.dateFrom ?? internalDateFrom
  const setDateFrom = controlledDateRange?.setDateFrom ?? setInternalDateFrom
  const dateTo = controlledDateRange?.dateTo ?? internalDateTo
  const setDateTo = controlledDateRange?.setDateTo ?? setInternalDateTo
  const [filterOpen, setFilterOpen] = useState(false)

  const isFiltered = typeFilter !== 'all' || categoryFilter !== 'all' || dateFrom !== '' || dateTo !== ''
  const hasDateRange = dateFrom !== '' && dateTo !== ''

  const monthTx = useMemo(
    () =>
      hasDateRange
        ? transactions
        : transactions.filter((t) => periodKey(t.date, startDay) === month),
    [transactions, month, startDay, hasDateRange]
  )

  const categories = useMemo(() => {
    const set = new Set(monthTx.map((t) => t.category))
    return [...set].sort()
  }, [monthTx])

  const filtered = useMemo(() => {
    return monthTx.filter((t) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false
      if (dateFrom !== '' && t.date < dateFrom) return false
      if (dateTo !== '' && t.date > dateTo) return false
      return true
    })
  }, [monthTx, typeFilter, categoryFilter, dateFrom, dateTo])

  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    for (const t of filtered) {
      const arr = map.get(t.date) ?? []
      arr.push(t)
      map.set(t.date, arr)
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    }
    return [...map.entries()].sort(([a], [b]) => (a < b ? 1 : -1))
  }, [filtered])

  return {
    typeFilter,
    setTypeFilter,
    categoryFilter,
    setCategoryFilter,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    filterOpen,
    setFilterOpen,
    isFiltered,
    categories,
    filtered,
    grouped,
  }
}
