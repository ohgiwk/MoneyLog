import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { workScheduleService } from '../../lib/services/workScheduleService'
import type { WorkSchedule } from '../../lib/database.types'

export function useWorkScheduleQuery(userId: string, month: string) {
  return useQuery({
    queryKey: ['workSchedule', userId, month],
    queryFn: () => workScheduleService.fetchByMonth(userId, month),
    enabled: !!userId && !!month,
  })
}

export function useWorkScheduleSetDayType(userId: string, month: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ date, dayType }: { date: string; dayType: WorkSchedule['day_type'] }) =>
      workScheduleService.setDayType(userId, date, dayType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workSchedule', userId, month] })
    },
  })
}

export function useWorkScheduleClearDayType(userId: string, month: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (date: string) => workScheduleService.clearDayType(userId, date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workSchedule', userId, month] })
    },
  })
}
