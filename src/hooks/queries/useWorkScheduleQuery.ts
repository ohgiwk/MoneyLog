import { useQuery } from '@tanstack/react-query'
import { workScheduleService } from '../../lib/services/workScheduleService'

export function useWorkScheduleQuery(userId: string, month: string) {
  return useQuery({
    queryKey: ['workSchedule', userId, month],
    queryFn: () => workScheduleService.fetchByMonth(userId, month),
    enabled: !!userId && !!month,
  })
}
