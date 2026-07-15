import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { budgetService, type BudgetSettings } from '../../lib/services/budgetService'
import { queryKeys } from '../../lib/queryKeys'

export function useBudgetQuery(userId: string, month: string) {
  return useQuery({
    queryKey: queryKeys.budget(userId, month),
    queryFn: () => budgetService.fetchByMonth(userId, month),
    enabled: !!userId && !!month,
  })
}

export function useBudgetMutation(userId: string, month: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (budget: BudgetSettings) => budgetService.save(userId, month, budget),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budget(userId, month) })
    },
  })
}
