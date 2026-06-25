import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { Session, User } from '@supabase/supabase-js'

vi.mock('../lib/services/authService', () => ({
  authService: {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
  },
}))

import { authService } from '../lib/services/authService'
import { useAuth } from './useAuth'

function makeSession(userId: string): Session {
  return {
    user: { id: userId, email: 'test@example.com' } as User,
    access_token: 'token',
    refresh_token: 'refresh',
    expires_in: 3600,
    token_type: 'bearer',
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  // デフォルト: onAuthStateChange はサブスクリプションを返す
  vi.mocked(authService.onAuthStateChange).mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  } as unknown as ReturnType<typeof authService.onAuthStateChange>)
})

describe('useAuth — 初期化', () => {
  it('セッションがある場合 user と session がセットされる', async () => {
    const session = makeSession('u1')
    vi.mocked(authService.getSession).mockResolvedValue({
      data: { session },
      error: null,
    } as Awaited<ReturnType<typeof authService.getSession>>)

    const { result } = renderHook(() => useAuth())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user?.id).toBe('u1')
    expect(result.current.session).toEqual(session)
  })

  it('セッションがない場合 user は null、loading は false になる', async () => {
    vi.mocked(authService.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    } as Awaited<ReturnType<typeof authService.getSession>>)

    const { result } = renderHook(() => useAuth())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user).toBeNull()
  })

  it('アンマウント時に subscription.unsubscribe を呼ぶ', async () => {
    const unsubscribe = vi.fn()
    vi.mocked(authService.onAuthStateChange).mockReturnValue({
      data: { subscription: { unsubscribe } },
    } as unknown as ReturnType<typeof authService.onAuthStateChange>)
    vi.mocked(authService.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    } as Awaited<ReturnType<typeof authService.getSession>>)

    const { unmount } = renderHook(() => useAuth())
    await waitFor(() => {})
    unmount()

    expect(unsubscribe).toHaveBeenCalled()
  })
})

describe('useAuth — 認証アクション', () => {
  beforeEach(() => {
    vi.mocked(authService.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    } as Awaited<ReturnType<typeof authService.getSession>>)
  })

  it('signInWithEmail が authService.signInWithPassword を呼ぶ', async () => {
    vi.mocked(authService.signInWithPassword).mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    } as Awaited<ReturnType<typeof authService.signInWithPassword>>)

    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.signInWithEmail('test@example.com', 'password')
    })

    expect(authService.signInWithPassword).toHaveBeenCalledWith('test@example.com', 'password')
  })

  it('signUpWithEmail が authService.signUp を呼ぶ', async () => {
    vi.mocked(authService.signUp).mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    } as Awaited<ReturnType<typeof authService.signUp>>)

    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.signUpWithEmail('new@example.com', 'password')
    })

    expect(authService.signUp).toHaveBeenCalledWith('new@example.com', 'password')
  })

  it('signOut が authService.signOut を呼ぶ', async () => {
    vi.mocked(authService.signOut).mockResolvedValue({ error: null })

    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.signOut()
    })

    expect(authService.signOut).toHaveBeenCalled()
  })
})
