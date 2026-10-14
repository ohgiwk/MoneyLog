import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { createSyncedStorage } from './syncedStorage'

const storage = createSyncedStorage<string[]>('test_', () => [])

beforeEach(() => {
  localStorage.clear()
})

describe('createSyncedStorage', () => {
  it('保存がないときは既定値を返し、has は false になる', () => {
    expect(storage.read('u1')).toEqual([])
    expect(storage.has('u1')).toBe(false)
  })

  it('書き込んだ値をユーザーごとのキーで読み戻せる', () => {
    storage.write('u1', ['a'])
    expect(storage.read('u1')).toEqual(['a'])
    expect(storage.has('u1')).toBe(true)
    expect(localStorage.getItem('test_u1')).toBe('["a"]')
    expect(storage.read('u2')).toEqual([])
  })

  it('保存データが壊れているときは既定値を返す', () => {
    localStorage.setItem('test_u1', '{broken')
    expect(storage.read('u1')).toEqual([])
  })

  it('useValue は書き込みを同じユーザーの全インスタンスへ反映し、別ユーザーには反映しない', () => {
    const a = renderHook(() => storage.useValue('u1'))
    const b = renderHook(() => storage.useValue('u1'))
    const other = renderHook(() => storage.useValue('u2'))
    act(() => storage.write('u1', ['x']))
    expect(a.result.current).toEqual(['x'])
    expect(b.result.current).toEqual(['x'])
    expect(other.result.current).toEqual([])
  })

  it('接頭辞の異なるストレージ同士は干渉しない', () => {
    const another = createSyncedStorage<string[]>('other_', () => [])
    const hook = renderHook(() => another.useValue('u1'))
    act(() => storage.write('u1', ['x']))
    expect(hook.result.current).toEqual([])
  })
})
