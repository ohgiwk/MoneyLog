import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { profileService } from '../../lib/services/profileService'
import { queryKeys } from '../../lib/queryKeys'
import type { Profile } from '../../lib/database.types'

export function useProfileQuery(userId: string) {
  return useQuery({
    queryKey: queryKeys.profile(userId),
    queryFn: () => profileService.fetchById(userId),
    enabled: !!userId,
  })
}

export function useProfileMutation(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Profile>) => profileService.update(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile(userId) })
    },
  })
}
