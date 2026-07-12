import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useForm, useIsDirty } from './useForm'

interface FormValues {
  name: string
  amount: string
}

describe('useForm', () => {
  it('初期値を values として保持する', () => {
    const { result } = renderHook(() => useForm<FormValues>({ name: '', amount: '0' }))
    expect(result.current.values).toEqual({ name: '', amount: '0' })
    expect(result.current.isSubmitting).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('setValue で指定したキーのみ更新する', () => {
    const { result } = renderHook(() => useForm<FormValues>({ name: '', amount: '0' }))
    act(() => result.current.setValue('name', 'テスト'))
    expect(result.current.values).toEqual({ name: 'テスト', amount: '0' })
  })

  it('setValues で全体を置き換える', () => {
    const { result } = renderHook(() => useForm<FormValues>({ name: '', amount: '0' }))
    act(() => result.current.setValues({ name: '新規', amount: '500' }))
    expect(result.current.values).toEqual({ name: '新規', amount: '500' })
  })

  it('setIsSubmitting / setError で状態を更新できる', () => {
    const { result } = renderHook(() => useForm<FormValues>({ name: '', amount: '0' }))
    act(() => {
      result.current.setIsSubmitting(true)
      result.current.setError('保存に失敗しました')
    })
    expect(result.current.isSubmitting).toBe(true)
    expect(result.current.error).toBe('保存に失敗しました')
  })

  it('reset で values・error・isSubmitting を初期状態に戻す', () => {
    const { result } = renderHook(() => useForm<FormValues>({ name: '', amount: '0' }))
    act(() => {
      result.current.setValue('name', '変更後')
      result.current.setIsSubmitting(true)
      result.current.setError('エラー')
    })

    act(() => result.current.reset())

    expect(result.current.values).toEqual({ name: '', amount: '0' })
    expect(result.current.isSubmitting).toBe(false)
    expect(result.current.error).toBeNull()
  })
})

describe('useIsDirty', () => {
  it('マウント時のスナップショットと同じ値なら isDirty は false', () => {
    const { result } = renderHook(() => useIsDirty({ name: '初期値' }))
    expect(result.current.isDirty).toBe(false)
  })

  it('値が変化すると isDirty は true になる', () => {
    const { result, rerender } = renderHook(({ values }) => useIsDirty(values), {
      initialProps: { values: { name: '初期値' } },
    })
    expect(result.current.isDirty).toBe(false)

    rerender({ values: { name: '変更後' } })
    expect(result.current.isDirty).toBe(true)
  })

  it('resetSnapshot で現在値を新しい基準にすると isDirty が false に戻る', () => {
    const { result, rerender } = renderHook(({ values }) => useIsDirty(values), {
      initialProps: { values: { name: '初期値' } },
    })
    rerender({ values: { name: '変更後' } })
    expect(result.current.isDirty).toBe(true)

    act(() => result.current.resetSnapshot({ name: '変更後' }))
    expect(result.current.isDirty).toBe(false)
  })

  it('resetSnapshot を引数なしで呼ぶと現在の values を基準にする', () => {
    const { result, rerender } = renderHook(({ values }) => useIsDirty(values), {
      initialProps: { values: { name: '初期値' } },
    })
    rerender({ values: { name: '変更後' } })

    act(() => result.current.resetSnapshot())

    expect(result.current.isDirty).toBe(false)
  })
})
