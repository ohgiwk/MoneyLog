import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import {
  renamePresetCategory,
  renameQuickPresetCategory,
  useQuickRecordPresets,
} from './useQuickRecordPresets'

beforeEach(() => {
  localStorage.clear()
})

describe('renamePresetCategory', () => {
  it('カテゴリ名で始まるキーだけを新しい名前に付け替える', () => {
    const presets = {
      '食費|500|ランチ': { name: 'いつもの昼', pinned: true },
      '食費代|300|': { pinned: true },
      '日用品|200|': { name: '洗剤' },
    }
    expect(renamePresetCategory(presets, '食費', '食料品')).toEqual({
      '食料品|500|ランチ': { name: 'いつもの昼', pinned: true },
      '食費代|300|': { pinned: true },
      '日用品|200|': { name: '洗剤' },
    })
  })
})

describe('renameQuickPresetCategory', () => {
  it('localStorage に保存されたプリセットのキーを付け替える', () => {
    localStorage.setItem('qrp_u1', JSON.stringify({ '食費|500|': { pinned: true } }))
    renameQuickPresetCategory('u1', '食費', '食料品')
    expect(JSON.parse(localStorage.getItem('qrp_u1')!)).toEqual({ '食料品|500|': { pinned: true } })
  })

  it('保存がなければ何もしない', () => {
    renameQuickPresetCategory('u1', '食費', '食料品')
    expect(localStorage.getItem('qrp_u1')).toBeNull()
  })
})

describe('useQuickRecordPresets', () => {
  it('更新したプリセットが localStorage に保存される', () => {
    const { result } = renderHook(() => useQuickRecordPresets('u1'))
    act(() => result.current.updatePreset('食費|500|', { pinned: true }))
    expect(result.current.presets).toEqual({ '食費|500|': { pinned: true } })
    expect(JSON.parse(localStorage.getItem('qrp_u1')!)).toEqual({ '食費|500|': { pinned: true } })
  })

  it('名前もピン留めもなくなったプリセットは削除される', () => {
    const { result } = renderHook(() => useQuickRecordPresets('u1'))
    act(() => result.current.updatePreset('食費|500|', { pinned: true }))
    act(() => result.current.updatePreset('食費|500|', { pinned: undefined }))
    expect(result.current.presets).toEqual({})
  })

  it('同じユーザーの別インスタンスにも変更が反映される', () => {
    const a = renderHook(() => useQuickRecordPresets('u1'))
    const b = renderHook(() => useQuickRecordPresets('u1'))
    act(() => a.result.current.updatePreset('食費|500|', { name: '昼' }))
    expect(b.result.current.presets).toEqual({ '食費|500|': { name: '昼' } })
  })

  it('別ユーザーのインスタンスには反映されない', () => {
    const a = renderHook(() => useQuickRecordPresets('u1'))
    const b = renderHook(() => useQuickRecordPresets('u2'))
    act(() => a.result.current.updatePreset('食費|500|', { pinned: true }))
    expect(b.result.current.presets).toEqual({})
  })
})
