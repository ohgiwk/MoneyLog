import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../lib/queryKeys'
import { shoppingMemoService } from '../../lib/services/shoppingMemoService'

export function useShoppingMemoQuery(userId: string) {
  return useQuery({
    queryKey: queryKeys.shoppingMemo(userId),
    queryFn: () => shoppingMemoService.fetchItems(userId),
    enabled: !!userId,
  })
}

export function useShoppingMemoAdd(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      name,
      memo,
      budgetAmount,
      group,
    }: {
      name: string
      memo: string | null
      budgetAmount: number
      group: string
    }) => shoppingMemoService.addItem(userId, name, memo, budgetAmount, group),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingMemo(userId) })
    },
  })
}

export function useShoppingMemoUpdate(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      name,
      memo,
      budgetAmount,
      group,
    }: {
      id: string
      name: string
      memo: string | null
      budgetAmount: number
      group: string
    }) => shoppingMemoService.updateItem(id, name, memo, budgetAmount, group),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingMemo(userId) })
    },
  })
}

export function useShoppingMemoDelete(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => shoppingMemoService.deleteItems(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingMemo(userId) })
    },
  })
}
