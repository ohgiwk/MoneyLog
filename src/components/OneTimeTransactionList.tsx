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
}

export default function OneTimeTransactionList({ transactions, month, setMonth, availableMonths, loading, onAdd, onEditTx }: Props) {
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
        />
      </div>

      {/* FAB */}
      <div className="fixed bottom-24 left-0 right-0 max-w-md mx-auto flex justify-end pr-5 pointer-events-none z-20">
        <button
          onClick={onAdd}
          className="pointer-events-auto w-14 h-14 rounded-full bg-emerald-500 text-white shadow-lg active:bg-emerald-600 flex items-center justify-center"
          aria-label="出費を追加"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>
    </>
  )
}
