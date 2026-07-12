import { describe, it, expect, vi, beforeEach } from 'vitest'
import { cacheGet, cacheSet, cacheRemove, cacheInvalidateTable, cachedFetch } from './cache'

beforeEach(() => {
  localStorage.clear()
})

describe('cacheGet / cacheSet / cacheRemove', () => {
  it('未設定のキーは null を返す', () => {
    expect(cacheGet('foo')).toBeNull()
  })

  it('cacheSet で保存した値を cacheGet で取得できる', () => {
    cacheSet('foo', { a: 1 })
    expect(cacheGet('foo')).toEqual({ a: 1 })
  })

  it('不正な JSON が保存されていても cacheGet は例外を投げず null を返す', () => {
    localStorage.setItem('moneylog:cache:foo', 'not json')
    expect(cacheGet('foo')).toBeNull()
  })

  it('cacheRemove で保存した値を削除できる', () => {
    cacheSet('foo', 1)
    cacheRemove('foo')
    expect(cacheGet('foo')).toBeNull()
  })
})

describe('cacheInvalidateTable', () => {
  it('指定テーブル配下のキャッシュのみ削除し、他テーブルは残す', () => {
    cacheSet('fixed_expenses:u1', ['a'])
    cacheSet('fixed_expenses:u2', ['b'])
    cacheSet('consumables:u1', ['c'])

    cacheInvalidateTable('fixed_expenses')

    expect(cacheGet('fixed_expenses:u1')).toBeNull()
    expect(cacheGet('fixed_expenses:u2')).toBeNull()
    expect(cacheGet('consumables:u1')).toEqual(['c'])
  })
})

describe('cachedFetch', () => {
  it('fetcher が成功した場合はその結果をキャッシュに保存して返す', async () => {
    const fetcher = vi.fn().mockResolvedValue({ value: 42 })
    const result = await cachedFetch('key1', fetcher)
    expect(result).toEqual({ value: 42 })
    expect(cacheGet('key1')).toEqual({ value: 42 })
  })

  it('fetcher が失敗してもキャッシュがあればフォールバックして返す', async () => {
    cacheSet('key2', { value: 'cached' })
    const fetcher = vi.fn().mockRejectedValue(new Error('network error'))
    const result = await cachedFetch('key2', fetcher)
    expect(result).toEqual({ value: 'cached' })
  })

  it('fetcher が失敗しキャッシュもない場合は元のエラーを再throwする', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('network error'))
    await expect(cachedFetch('key3', fetcher)).rejects.toThrow('network error')
  })
})
