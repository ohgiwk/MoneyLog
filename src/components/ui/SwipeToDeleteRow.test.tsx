import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SwipeToDeleteRow from './SwipeToDeleteRow'

describe('SwipeToDeleteRow', () => {
  it('子要素と削除ボタンが描画される', () => {
    render(
      <SwipeToDeleteRow onDelete={() => {}}>
        <div>牛乳</div>
      </SwipeToDeleteRow>
    )
    expect(screen.getByText('牛乳')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '削除' })).toBeInTheDocument()
  })

  it('削除ボタンを押すと onDelete が呼ばれる', () => {
    const onDelete = vi.fn()
    render(
      <SwipeToDeleteRow onDelete={onDelete}>
        <div>牛乳</div>
      </SwipeToDeleteRow>
    )
    fireEvent.click(screen.getByRole('button', { name: '削除' }))
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('onDelete が失敗しても例外を外に漏らさない', async () => {
    const onDelete = vi.fn().mockRejectedValue(new Error('failed'))
    render(
      <SwipeToDeleteRow onDelete={onDelete}>
        <div>牛乳</div>
      </SwipeToDeleteRow>
    )
    fireEvent.click(screen.getByRole('button', { name: '削除' }))
    await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1))
    expect(screen.getByText('牛乳')).toBeInTheDocument()
  })

  it('閉じている状態では削除ボタンがタブ移動の対象にならない', () => {
    render(
      <SwipeToDeleteRow onDelete={() => {}}>
        <div>牛乳</div>
      </SwipeToDeleteRow>
    )
    expect(screen.getByRole('button', { name: '削除' })).toHaveAttribute('tabindex', '-1')
  })

  it('閉じている状態では行のタップが子要素にそのまま届く', () => {
    const onClick = vi.fn()
    render(
      <SwipeToDeleteRow onDelete={() => {}}>
        <div onClick={onClick}>牛乳</div>
      </SwipeToDeleteRow>
    )
    fireEvent.click(screen.getByText('牛乳'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('deleteLabel でボタンの文言を変えられる', () => {
    render(
      <SwipeToDeleteRow onDelete={() => {}} deleteLabel="消す">
        <div>牛乳</div>
      </SwipeToDeleteRow>
    )
    expect(screen.getByRole('button', { name: '消す' })).toBeInTheDocument()
  })
})
