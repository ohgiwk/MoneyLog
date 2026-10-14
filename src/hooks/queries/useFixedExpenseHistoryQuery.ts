import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fixedExpenseHistoryService } from '../../lib/services/fixedExpenseHistoryService'
import { buildMonthlySnapshot, diffMonthlyRecords } from '../../lib/fixedExpenseHistory'
import { currentMonthStr } from '../../lib/loan'
import { queryKeys } from '../../lib/queryKeys'
import { useFixedExpensesQuery } from './useFixedExpensesQuery'
import type { FixedExpense } from '../../lib/database.types'

export function useFixedExpenseHistoryQuery(userId: string) {
  return useQuery({
    queryKey: queryKeys.fixedExpenseHistory(userId),
    queryFn: () => fixedExpenseHistoryService.fetchByUser(userId),
    enabled: !!userId,
  })
}

// 当月の固定費の記録を、固定費の設定に合わせて作成・更新する。
// 固定費の変更は複数の画面から行われ、どれも最後に固定費一覧を取り直すため、一覧の取得結果を見て同期する。
// 前月以前の記録には触れないので、月が替わった時点の内容がその月の確定値として残る
export function useFixedExpenseMonthlySync(userId: string) {
  const queryClient = useQueryClient()
  const { data, isSuccess, isFetching, dataUpdatedAt } = useFixedExpensesQuery(userId)
  // 同期中に固定費が変わったときも、前の同期が終わってから最新の内容で同期し直すよう直列に実行する
  const chainRef = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    if (!userId || !isSuccess || isFetching || !data) return
    const fixedExpenses: FixedExpense[] = data

    async function sync() {
      const month = currentMonthStr()
      const existing = await fixedExpenseHistoryService.fetchByMonth(userId, month)
      const { upserts, deleteIds } = diffMonthlyRecords(
        existing,
        buildMonthlySnapshot(userId, fixedExpenses, month)
      )
      if (upserts.length === 0 && deleteIds.length === 0) return
      await fixedExpenseHistoryService.deleteByIds(deleteIds)
      await fixedExpenseHistoryService.upsertMany(upserts)
      await queryClient.invalidateQueries({ queryKey: queryKeys.fixedExpenseHistory(userId) })
    }

    chainRef.current = chainRef.current
      .then(sync)
      .catch((e: unknown) => console.warn('固定費の月次記録の同期に失敗しました', e))
  }, [userId, isSuccess, isFetching, data, dataUpdatedAt, queryClient])
}
