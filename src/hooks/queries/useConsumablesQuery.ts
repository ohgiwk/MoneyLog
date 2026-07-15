import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { consumableService } from '../../lib/services/consumableService'
import { queryKeys } from '../../lib/queryKeys'
import type { Consumable } from '../../lib/database.types'

type ConsumableInsert = Omit<Consumable, 'id' | 'created_at'>
type ConsumableUpdate = Partial<ConsumableInsert>

export function useConsumablesQuery(userId: string) {
  return useQuery({
    queryKey: queryKeys.consumables(userId),
    queryFn: () => consumableService.fetchByUser(userId),
    enabled: !!userId,
  })
}

export function useConsumableInsert(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: ConsumableInsert) => consumableService.insert(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.consumables(userId) })
    },
  })
}

export function useConsumableUpdate(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ConsumableUpdate }) =>
      consumableService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.consumables(userId) })
    },
  })
}

export function useConsumableDelete(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => consumableService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.consumables(userId) })
    },
  })
}
