import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { transactionService } from '../../lib/services/transactionService'
import { queryKeys } from '../../lib/queryKeys'
import type { Transaction } from '../../lib/database.types'

type TransactionInsert = Omit<Transaction, 'id' | 'created_at'>

export function useTransactionsQuery(userId: string, month: string, startDay = 1) {
  return useQuery({
    queryKey: [...queryKeys.transactions(userId, month), startDay],
    queryFn: () => transactionService.fetchByMonth(userId, month, startDay),
    enabled: !!userId && !!month,
  })
}

export function useTransactionInsert(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: TransactionInsert) => transactionService.insert(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions(userId, '') .slice(0, 2) })
    },
  })
}

export function useTransactionUpdate(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TransactionInsert> }) =>
      transactionService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', userId] })
    },
  })
}

export function useTransactionDelete(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => transactionService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', userId] })
    },
  })
}
