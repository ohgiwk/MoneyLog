import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePaymentMethods, getDefaultPayment } from './usePaymentMethods'

beforeEach(() => {
  localStorage.clear()
})

describe('usePaymentMethods — 初期値', () => {
  it('localStorage が空のとき methods は空配列、defaultPayment は現金になる', () => {
    const { result } = renderHook(() => usePaymentMethods())
    expect(result.current.methods).toEqual([])
    expect(result.current.defaultPayment).toEqual({ type: 'cash', name: null })
  })
})

describe('usePaymentMethods — addMethod', () => {
  it('支払い方法を追加すると methods と localStorage に反映される', () => {
    const { result } = renderHook(() => usePaymentMethods())

    act(() => result.current.addMethod('credit_card', 'メインカード'))

    expect(result.current.methods).toHaveLength(1)
    expect(result.current.methods[0]).toMatchObject({ type: 'credit_card', name: 'メインカード' })
    const saved = JSON.parse(localStorage.getItem('moneylog_payment_methods')!)
    expect(saved).toHaveLength(1)
  })

  it('前後の空白のみの名前は追加しない', () => {
    const { result } = renderHook(() => usePaymentMethods())
    act(() => result.current.addMethod('credit_card', '   '))
    expect(result.current.methods).toEqual([])
  })

  it('前後の空白はトリムして保存する', () => {
    const { result } = renderHook(() => usePaymentMethods())
    act(() => result.current.addMethod('credit_card', '  トリムカード  '))
    expect(result.current.methods[0].name).toBe('トリムカード')
  })
})

describe('usePaymentMethods — removeMethod', () => {
  it('指定した id の支払い方法を削除する', () => {
    const { result } = renderHook(() => usePaymentMethods())
    act(() => result.current.addMethod('credit_card', 'カードA'))
    const id = result.current.methods[0].id

    act(() => result.current.removeMethod(id))

    expect(result.current.methods).toEqual([])
  })

  it('デフォルトに設定していた支払い方法を削除すると現金に戻す', () => {
    const { result } = renderHook(() => usePaymentMethods())
    act(() => result.current.addMethod('credit_card', 'カードA'))
    const method = result.current.methods[0]
    act(() => result.current.setDefaultPayment({ type: method.type, name: method.name }))
    expect(result.current.defaultPayment).toEqual({ type: 'credit_card', name: 'カードA' })

    act(() => result.current.removeMethod(method.id))

    expect(result.current.defaultPayment).toEqual({ type: 'cash', name: null })
  })

  it('デフォルトではない支払い方法を削除してもデフォルトは変わらない', () => {
    const { result } = renderHook(() => usePaymentMethods())
    act(() => {
      result.current.addMethod('credit_card', 'カードA')
      result.current.addMethod('credit_card', 'カードB')
    })
    const [methodA, methodB] = result.current.methods
    act(() => result.current.setDefaultPayment({ type: methodA.type, name: methodA.name }))

    act(() => result.current.removeMethod(methodB.id))

    expect(result.current.defaultPayment).toEqual({ type: 'credit_card', name: 'カードA' })
  })
})

describe('usePaymentMethods — setDefaultPayment / getDefaultPayment', () => {
  it('setDefaultPayment で保存した値は getDefaultPayment からも取得できる', () => {
    const { result } = renderHook(() => usePaymentMethods())
    act(() => result.current.setDefaultPayment({ type: 'credit_card', name: 'カードA' }))
    expect(getDefaultPayment()).toEqual({ type: 'credit_card', name: 'カードA' })
  })
})
