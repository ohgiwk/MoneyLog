import '@testing-library/jest-dom'

// Node 22+ が定義するグローバル localStorage は --localstorage-file 未指定だと
// 常に undefined を返し、jsdom 環境下でのテストで localStorage が使えなくなる。
// jsdom の Storage 相当の簡易インメモリ実装で globalThis.localStorage を上書きする。
class MemoryStorage implements Storage {
  private store = new Map<string, string>()

  get length() {
    return this.store.size
  }

  clear() {
    this.store.clear()
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null
  }

  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null
  }

  removeItem(key: string) {
    this.store.delete(key)
  }

  setItem(key: string, value: string) {
    this.store.set(key, String(value))
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  value: new MemoryStorage(),
  configurable: true,
  writable: true,
})
