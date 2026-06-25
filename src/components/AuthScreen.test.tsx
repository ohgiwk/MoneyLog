import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from '../hooks/useAuth'
import AuthScreen from './AuthScreen'

function makeUseAuth(overrides: Partial<ReturnType<typeof useAuth>> = {}) {
  return {
    user: null,
    session: null,
    loading: false,
    signInWithEmail: vi.fn().mockResolvedValue({ error: null }),
    signUpWithEmail: vi.fn().mockResolvedValue({ error: null }),
    signInWithGoogle: vi.fn().mockResolvedValue({}),
    signOut: vi.fn(),
    ...overrides,
  }
}

function submitForm() {
  fireEvent.submit(screen.getByRole('textbox', { name: 'メールアドレス' }).closest('form')!)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useAuth).mockReturnValue(makeUseAuth())
})

describe('AuthScreen — 表示', () => {
  it('ログインモードで初期表示される', () => {
    render(<AuthScreen />)
    expect(screen.getByText('マネログ')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'ログイン' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '新規登録' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'メールアドレス' })).toBeInTheDocument()
  })

  it('新規登録タブに切り替えるとボタンのラベルが変わる', async () => {
    render(<AuthScreen />)
    await userEvent.click(screen.getByRole('tab', { name: '新規登録' }))
    expect(screen.getByRole('button', { name: 'アカウントを作成' })).toBeInTheDocument()
  })
})

describe('AuthScreen — ログイン送信', () => {
  it('メールとパスワードを入力して送信すると signInWithEmail が呼ばれる', async () => {
    const signInWithEmail = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(useAuth).mockReturnValue(makeUseAuth({ signInWithEmail }))

    render(<AuthScreen />)
    await userEvent.type(
      screen.getByRole('textbox', { name: 'メールアドレス' }),
      'test@example.com'
    )
    await userEvent.type(screen.getByPlaceholderText('パスワード'), 'password123')
    submitForm()

    await waitFor(() => {
      expect(signInWithEmail).toHaveBeenCalledWith('test@example.com', 'password123')
    })
  })

  it('エラーが返った場合にエラーメッセージが表示される', async () => {
    const signInWithEmail = vi.fn().mockResolvedValue({ error: { message: 'Invalid credentials' } })
    vi.mocked(useAuth).mockReturnValue(makeUseAuth({ signInWithEmail }))

    render(<AuthScreen />)
    await userEvent.type(
      screen.getByRole('textbox', { name: 'メールアドレス' }),
      'wrong@example.com'
    )
    await userEvent.type(screen.getByPlaceholderText('パスワード'), 'wrongpass')
    submitForm()

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
    })
  })
})

describe('AuthScreen — 新規登録送信', () => {
  it('新規登録モードで送信すると signUpWithEmail が呼ばれる', async () => {
    const signUpWithEmail = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(useAuth).mockReturnValue(makeUseAuth({ signUpWithEmail }))

    render(<AuthScreen />)
    await userEvent.click(screen.getByRole('tab', { name: '新規登録' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'メールアドレス' }), 'new@example.com')
    await userEvent.type(screen.getByPlaceholderText('パスワード'), 'newpass123')
    submitForm()

    await waitFor(() => {
      expect(signUpWithEmail).toHaveBeenCalledWith('new@example.com', 'newpass123')
    })
  })
})

describe('AuthScreen — Google ログイン', () => {
  it('Googleでログインボタンをクリックすると signInWithGoogle が呼ばれる', async () => {
    const signInWithGoogle = vi.fn().mockResolvedValue({})
    vi.mocked(useAuth).mockReturnValue(makeUseAuth({ signInWithGoogle }))

    render(<AuthScreen />)
    await userEvent.click(screen.getByRole('button', { name: /Google/ }))

    expect(signInWithGoogle).toHaveBeenCalled()
  })
})
