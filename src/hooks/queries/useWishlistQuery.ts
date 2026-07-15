import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { wishlistService, type WishlistItem } from '../../lib/services/wishlistService'

type WishlistInsert = Omit<WishlistItem, 'id' | 'created_at'>

export function useWishlistQuery(userId: string) {
  return useQuery({
    queryKey: ['wishlist', userId],
    queryFn: () => wishlistService.fetchByUser(userId),
    enabled: !!userId,
  })
}

export function useWishlistInsert(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (item: WishlistInsert) => wishlistService.insert(item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist', userId] })
    },
  })
}

export function useWishlistUpdate(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<WishlistInsert> }) =>
      wishlistService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist', userId] })
    },
  })
}

export function useWishlistDelete(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => wishlistService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist', userId] })
    },
  })
}
