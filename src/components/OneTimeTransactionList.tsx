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
  onDeleteTx?: (id: string) => void
  onDuplicateTx?: (tx: Transaction) => void
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
  storeTypeFilter?: string
  paymentTypeFilter?: string
}

export default function OneTimeTransactionList({
  transactions,
  month,
  setMonth,
  availableMonths,
  loading,
  onEditTx,
  onDeleteTx,
  onDuplicateTx,
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
  storeTypeFilter,
  paymentTypeFilter,
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
          onDeleteTx={onDeleteTx}
          onDuplicateTx={onDuplicateTx}
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
          storeTypeFilter={storeTypeFilter}
          paymentTypeFilter={paymentTypeFilter}
        />
      </div>
    </>
  )
}
