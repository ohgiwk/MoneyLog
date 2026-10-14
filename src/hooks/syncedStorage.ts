import { useEffect, useState } from 'react'

// localStorage に保存する、ユーザーごとの値。
// 同じ画面の複数箇所（長押しシートと記録タブなど）で使われても、変更が互いに伝わる
export function createSyncedStorage<T>(keyPrefix: string, fallback: () => T) {
  const eventName = `synced-storage:${keyPrefix}`
  type ChangeDetail = { userId: string; value: T }

  function has(userId: string): boolean {
    try {
      return localStorage.getItem(keyPrefix + userId) !== null
    } catch {
      return false
    }
  }

  function read(userId: string): T {
    try {
      const raw = localStorage.getItem(keyPrefix + userId)
      return raw ? (JSON.parse(raw) as T) : fallback()
    } catch {
      return fallback()
    }
  }

  function write(userId: string, value: T) {
    try {
      localStorage.setItem(keyPrefix + userId, JSON.stringify(value))
    } catch {
      // 保存できなくても、表示中の画面には変更を反映する
    }
    window.dispatchEvent(new CustomEvent<ChangeDetail>(eventName, { detail: { userId, value } }))
  }

  function useValue(userId: string): T {
    const [value, setValue] = useState<T>(() => read(userId))

    useEffect(() => {
      function sync(e: Event) {
        const detail = (e as CustomEvent<ChangeDetail>).detail
        if (detail.userId === userId) setValue(detail.value)
      }
      window.addEventListener(eventName, sync)
      return () => window.removeEventListener(eventName, sync)
    }, [userId])

    return value
  }

  return { has, read, write, useValue }
}
