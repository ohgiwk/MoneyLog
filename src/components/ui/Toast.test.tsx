import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import Toast from './Toast'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Toast', () => {
  it('メッセージとアクションボタンが表示される', () => {
    render(
      <Toast message="削除しました" actionLabel="元に戻す" onAction={() => {}} onClose={() => {}} />
    )
    expect(screen.getByRole('status')).toHaveTextContent('削除しました')
    expect(screen.getByRole('button', { name: '元に戻す' })).toBeInTheDocument()
  })

  it('actionLabel がないときはボタンを表示しない', () => {
    render(<Toast message="削除しました" onClose={() => {}} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('アクションボタンを押すと onAction が呼ばれる', () => {
    const onAction = vi.fn()
    render(
      <Toast message="削除しました" actionLabel="元に戻す" onAction={onAction} onClose={() => {}} />
    )
    fireEvent.click(screen.getByRole('button', { name: '元に戻す' }))
    expect(onAction).toHaveBeenCalledTimes(1)
  })

  it('duration 経過後に onClose が呼ばれる', () => {
    const onClose = vi.fn()
    render(<Toast message="削除しました" onClose={onClose} duration={3000} />)
    act(() => {
      vi.advanceTimersByTime(2999)
    })
    expect(onClose).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('message が変わると表示時間を数え直す', () => {
    const onClose = vi.fn()
    const { rerender } = render(
      <Toast message="1件を削除しました" onClose={onClose} duration={3000} />
    )
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    rerender(<Toast message="2件を削除しました" onClose={onClose} duration={3000} />)
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(onClose).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
