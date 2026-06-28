import { useEffect, useState } from 'react'
import { transactionService } from '../lib/services/transactionService'
import type { Transaction } from '../lib/database.types'
import MonthSwitcher from './ui/MonthSwitcher'
import TransactionDetailView from './TransactionDetailView'

interface Props {
  userId: string
  month: string
  setMonth: (m: string) => void
  onBack: () => void
  onEditTx?: (tx: Transaction) => void
}

export default function RecordDetailScreen({ userId, month, setMonth, onBack, onEditTx }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => { window.scrollTo(0, 0) }, [])

  useEffect(() => {
    const load = async () => {
      setFetchError(null)
      try {
        const txs = await transactionService.fetchByMonth(userId, month)
        setTransactions(txs)
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : 'データの読み込みに失敗しました')
      }
    }
    void load()
  }, [userId, month])

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col">
      <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-slate-500 active:text-slate-700 text-lg px-1"
          aria-label="戻る"
        >
          ←
        </button>
        <span className="font-semibold text-slate-800 flex-1">記録詳細</span>
      </div>

      <MonthSwitcher month={month} setMonth={setMonth} />

      {fetchError && (
        <div className="mx-4 mt-3 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-600">
          {fetchError}
        </div>
      )}

      <div className="p-4">
        <TransactionDetailView transactions={transactions} month={month} onEditTx={onEditTx} />
      </div>
    </div>
  )
}
