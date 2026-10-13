import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PinnedItemSheet from './PinnedItemSheet'
import type { PinnedItemDraft } from '../hooks/usePinnedItems'

vi.mock('../contexts/AppContext', () => ({
  useAppContext: () => ({
    categories: {
      activeExpenseCategories: [
        { name: '食費', icon: '🍽️', color: '#000' },
        { name: '日用品', icon: '🧴', color: '#000' },
      ],
    },
  }),
}))

const initial: PinnedItemDraft = {
  name: 'いつもの昼',
  category: '食費',
  amount: 500,
  memo: 'ランチ',
  store_type: 'コンビニ',
  meal_type: '昼食',
  payment_type: 'qr',
  payment_method: 'PayPay',
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem(
    'moneylog_payment_methods',
    JSON.stringify([{ id: 'm1', type: 'qr', name: 'PayPay' }])
  )
})

describe('PinnedItemSheet', () => {
  it('新規作成: 入力した内容で onSave が呼ばれ、未入力の任意項目は null になる', () => {
    const onSave = vi.fn()
    render(<PinnedItemSheet isOpen initial={null} onSave={onSave} onClose={() => {}} />)
    fireEvent.change(screen.getByLabelText('金額'), { target: { value: '300' } })
    fireEvent.click(screen.getByRole('button', { name: /日用品/ }))
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    expect(onSave).toHaveBeenCalledWith({
      name: null,
      category: '日用品',
      amount: 300,
      memo: null,
      store_type: null,
      meal_type: null,
      payment_type: null,
      payment_method: null,
    })
  })

  it('金額が未入力・0 以下のときは保存せずエラーを表示する', () => {
    const onSave = vi.fn()
    render(<PinnedItemSheet isOpen initial={null} onSave={onSave} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    fireEvent.change(screen.getByLabelText('金額'), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByText('金額を1円以上の整数で入力してください')).toBeInTheDocument()
  })

  it('編集: 何も変えずに保存すると元の内容がそのまま渡る', () => {
    const onSave = vi.fn()
    render(<PinnedItemSheet isOpen initial={initial} onSave={onSave} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    expect(onSave).toHaveBeenCalledWith(initial)
  })

  it('編集: カテゴリ・店舗種別・支払い方法を変更できる', () => {
    const onSave = vi.fn()
    render(<PinnedItemSheet isOpen initial={initial} onSave={onSave} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /日用品/ }))
    fireEvent.change(screen.getByLabelText('店舗種別'), { target: { value: 'スーパー' } })
    fireEvent.click(screen.getByRole('button', { name: /現金/ }))
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    expect(onSave).toHaveBeenCalledWith({
      ...initial,
      category: '日用品',
      store_type: 'スーパー',
      // 食費でなくなったので食事タイプは外れ、現金なので利用サービスも外れる
      meal_type: null,
      payment_type: 'cash',
      payment_method: null,
    })
  })

  it('選択中の支払い方法をもう一度押すと未選択に戻る', () => {
    const onSave = vi.fn()
    render(<PinnedItemSheet isOpen initial={initial} onSave={onSave} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /QRコード決済/ }))
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    expect(onSave).toHaveBeenCalledWith({ ...initial, payment_type: null, payment_method: null })
  })

  it('閉じるを押すと onClose が呼ばれ、保存はされない', () => {
    const onSave = vi.fn()
    const onClose = vi.fn()
    render(<PinnedItemSheet isOpen initial={initial} onSave={onSave} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: '閉じる' }))
    expect(onClose).toHaveBeenCalled()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('タイトルは新規作成と編集で切り替わる', () => {
    const { unmount } = render(
      <PinnedItemSheet isOpen initial={null} onSave={() => {}} onClose={() => {}} />
    )
    expect(screen.getByRole('heading')).toHaveTextContent('ピン留めを追加')
    unmount()
    render(<PinnedItemSheet isOpen initial={initial} onSave={() => {}} onClose={() => {}} />)
    expect(screen.getByRole('heading')).toHaveTextContent('ピン留めを編集')
  })

  it('isOpen が false のときは何も表示しない', () => {
    render(<PinnedItemSheet isOpen={false} initial={null} onSave={() => {}} onClose={() => {}} />)
    expect(screen.queryByRole('button', { name: '保存' })).not.toBeInTheDocument()
  })
})
