import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'motion/react'
import { useBudgetQuery } from '../hooks/queries/useBudgetQuery'
import { useTransactionsQuery } from '../hooks/queries/useTransactionsQuery'
import { useFixedExpensesQuery } from '../hooks/queries/useFixedExpensesQuery'
import { budgetService } from '../lib/services/budgetService'
import { queryKeys } from '../lib/queryKeys'
import { formatYen, monthLabel, shiftMonth, todayStr } from '../utils'
import Button from './ui/Button'

interface Props {
  userId: string
}

export default function NewMonthBudgetDialog({ userId }: Props) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const currentMonth = todayStr().slice(0, 7)
  const lastMonth = shiftMonth(currentMonth, -1)

  const [copying, setCopying] = useState(false)

  const { data: currentBudget, isLoading: currentBudgetLoading } = useBudgetQuery(userId, currentMonth)
  const { data: lastBudget, isLoading: lastBudgetLoading } = useBudgetQuery(userId, lastMonth)
  const { data: lastMonthTx = [], isLoading: txLoading } = useTransactionsQuery(userId, lastMonth)
  const { data: fixedExpenses = [] } = useFixedExpensesQuery(userId)

  const lastMonthIncome = useMemo(
    () => lastMonthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    [lastMonthTx]
  )
  const lastMonthOneTime = useMemo(
    () =>
      lastMonthTx
        .filter((t) => t.type === 'expense' && t.expense_kind === 'one_time')
        .reduce((s, t) => s + t.amount, 0),
    [lastMonthTx]
  )
  const totalFixed = useMemo(
    () =>
      fixedExpenses
        .filter((f) => f.status === 'active' || f.status === 'reviewing')
        .reduce((s, f) => s + (f.amount ?? 0) / (f.cycle === 'yearly' ? 12 : 1), 0),
    [fixedExpenses]
  )
  const lastMonthBalance = lastMonthIncome - Math.round(totalFixed) - lastMonthOneTime

  const isLoading = currentBudgetLoading || lastBudgetLoading || txLoading
  const noBudgetSet = !isLoading && (currentBudget?.income ?? 0) === 0
  const hasLastBudget = (lastBudget?.income ?? 0) > 0

  async function handleCopyLastMonth() {
    if (!lastBudget || !hasLastBudget) return
    setCopying(true)
    try {
      await budgetService.save(userId, currentMonth, lastBudget)
      queryClient.invalidateQueries({ queryKey: queryKeys.budget(userId, currentMonth) })
    } finally {
      setCopying(false)
    }
  }

  return createPortal(
    <AnimatePresence>
      {noBudgetSet && (
        <motion.div
          key="new-month-dialog-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="absolute inset-0 bg-black/40" />
          <motion.div
            className="relative w-[calc(100%-2rem)] max-w-sm bg-surface rounded-2xl shadow-xl px-5 pt-5 pb-5 space-y-4"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.4, delay: 0.08, ease: 'easeOut' }}
          >
            {/* ヘッダー */}
            <div className="text-center">
              <div className="text-xl font-bold text-ink-strong">１ヶ月お疲れさまでした🎉</div>
              <div className="text-xs text-ink-muted mt-1">{monthLabel(lastMonth)}の収支</div>
            </div>

            {/* 先月の収支 */}
            {txLoading ? (
              <div className="text-center py-8 text-ink-muted text-sm">読み込み中...</div>
            ) : (
              <div className="bg-surface-subtle rounded-xl py-6 flex flex-col items-center gap-1">
                <div className="text-xs text-ink-muted">先月の収支</div>
                <div className={`text-4xl font-bold tracking-tight ${lastMonthBalance >= 0 ? 'text-income-600' : 'text-danger-500'}`}>
                  {(lastMonthBalance >= 0 ? '+' : '') + formatYen(lastMonthBalance)}
                </div>
              </div>
            )}

            {/* アクションボタン */}
            <div className="space-y-2 pt-1">
              {hasLastBudget && (
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={handleCopyLastMonth}
                  disabled={copying}
                >
                  {copying ? '設定中...' : '先月と同じ予算に設定'}
                </Button>
              )}
              <Button fullWidth onClick={() => navigate('/budget')}>
                今月の予算を設定する
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
