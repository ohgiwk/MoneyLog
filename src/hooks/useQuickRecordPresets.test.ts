import { describe, it, expect, beforeEach } from 'vitest'
import { renamePresetCategory, renameQuickPresetCategory } from './useQuickRecordPresets'

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
