import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fixedExpenseService } from '../../lib/services/fixedExpenseService'
import { queryKeys } from '../../lib/queryKeys'
import type { FixedExpense } from '../../lib/database.types'

type FixedExpenseInsert = Omit<FixedExpense, 'id' | 'created_at'>
type FixedExpenseUpdate = Partial<FixedExpenseInsert>

export function useFixedExpensesQuery(userId: string) {
  return useQuery({
    queryKey: queryKeys.fixedExpenses(userId),
    queryFn: () => fixedExpenseService.fetchByUser(userId),
    enabled: !!userId,
  })
}

export function useFixedExpenseInsert(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: FixedExpenseInsert) => fixedExpenseService.insert(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fixedExpenses(userId) })
    },
  })
}

export function useFixedExpenseUpdate(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: FixedExpenseUpdate }) =>
      fixedExpenseService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fixedExpenses(userId) })
    },
  })
}

export function useFixedExpenseDelete(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => fixedExpenseService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fixedExpenses(userId) })
    },
  })
}
