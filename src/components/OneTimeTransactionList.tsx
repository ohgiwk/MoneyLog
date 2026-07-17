import type { Transaction } from '../lib/database.types'
import TransactionDetailView from './TransactionDetailView'

interface Props {
  transactions: Transaction[]
  month: string
  setMonth: (m: string) => void
  availableMonths: string[]
  loading?: boolean
  onAdd: () => void
  onEditTx: (tx: Transaction) => void
  startDay?: number
  budget?: number
  dateFrom?: string
  setDateFrom?: (v: string) => void
  dateTo?: string
  setDateTo?: (v: string) => void
  typeFilter?: 'all' | 'expense' | 'income'
  setTypeFilter?: (v: 'all' | 'expense' | 'income') => void
  categoryFilter?: string
  setCategoryFilter?: (v: string) => void
}

export default function OneTimeTransactionList({
  transactions,
  month,
  setMonth,
  availableMonths,
  loading,
  onEditTx,
  startDay,
  budget,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  typeFilter,
  setTypeFilter,
  categoryFilter,
  setCategoryFilter,
}: Props) {
  return (
    <>
      <div className="p-4">
        <TransactionDetailView
          transactions={transactions}
          month={month}
          setMonth={setMonth}
          availableMonths={availableMonths}
          loading={loading}
          onEditTx={onEditTx}
          startDay={startDay}
          budget={budget}
          dateFrom={dateFrom}
          setDateFrom={setDateFrom}
          dateTo={dateTo}
          setDateTo={setDateTo}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
        />
      </div>

    </>
  )
}
