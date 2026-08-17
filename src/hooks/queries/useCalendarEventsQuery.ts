import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { calendarEventService } from '../../lib/services/calendarEventService'
import type { CalendarEvent } from '../../lib/database.types'

type CalendarEventInsert = Omit<CalendarEvent, 'id' | 'created_at'>

export function useCalendarEventsQuery(userId: string, month: string) {
  return useQuery({
    queryKey: ['calendarEvents', userId, month],
    queryFn: () => calendarEventService.fetchByMonth(userId, month),
    enabled: !!userId && !!month,
  })
}

export function useCalendarEventInsert(userId: string, month: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CalendarEventInsert) => calendarEventService.insert(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarEvents', userId, month] })
      queryClient.invalidateQueries({ queryKey: ['calendarEvents', 'upcoming', userId] })
    },
  })
}

export function useCalendarEventUpdate(userId: string, month: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CalendarEventInsert> }) =>
      calendarEventService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarEvents', userId, month] })
      queryClient.invalidateQueries({ queryKey: ['calendarEvents', 'upcoming', userId] })
    },
  })
}

export function useCalendarEventDelete(userId: string, month: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => calendarEventService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarEvents', userId, month] })
      queryClient.invalidateQueries({ queryKey: ['calendarEvents', 'upcoming', userId] })
    },
  })
}
