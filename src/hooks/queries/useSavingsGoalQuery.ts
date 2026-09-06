import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { savingsGoalService } from '../../lib/services/savingsGoalService'

export type SavingsGoalEntry = { amount: number; monthlyTarget: number }

const queryKey = (userId: string) => ['savings-goals', userId]

export function useSavingsGoalQuery(userId: string) {
  return useQuery({
    queryKey: queryKey(userId),
    queryFn: async () => {
      const goals = await savingsGoalService.fetchByUser(userId)
      const map: Record<string, SavingsGoalEntry> = {}
      for (const g of goals) {
        if (g.wishlist_item_id) {
          map[g.wishlist_item_id] = {
            amount: g.target_amount,
            monthlyTarget: g.monthly_target ?? 0,
          }
        }
      }
      return map
    },
    enabled: !!userId,
  })
}

export function useSavingsGoalSave(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (
      allocations: { wishlistItemId: string; amount: number; monthlyTarget?: number }[]
    ) => savingsGoalService.saveAllocations(userId, allocations),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKey(userId) })
    },
  })
}
