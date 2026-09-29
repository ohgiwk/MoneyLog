import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { workplaceService } from '../../lib/services/workplaceService'
import type { ShiftType } from '../../lib/database.types'

export function useWorkplacesQuery(userId: string) {
  const query = useQuery({
    queryKey: ['workplaces', userId],
    queryFn: () => workplaceService.fetchOrSeed(userId),
    enabled: !!userId,
  })

  const workplaces = useMemo(() => query.data?.workplaces ?? [], [query.data])
  const shiftTypes = useMemo(() => query.data?.shiftTypes ?? [], [query.data])
  // 削除済みも含めて引けるようにし、過去の記録を表示できるようにする
  const shiftTypeById = useMemo(
    () => new Map<string, ShiftType>(shiftTypes.map((t) => [t.id, t])),
    [shiftTypes]
  )

  return { ...query, workplaces, shiftTypes, shiftTypeById }
}
