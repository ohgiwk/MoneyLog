const PREFIX = 'moneylog:cache:'

export function cacheGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function cacheSet<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // localStorage が使えない環境（プライベートモード等）では無視する
  }
}

export function cacheRemove(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    // noop
  }
}

// id 単位の update/delete では対象のキャッシュキーが特定できないため、
// テーブル配下の全キャッシュを削除して次回取得時にDBから再取得させる
export function cacheInvalidateTable(table: string): void {
  try {
    const tablePrefix = PREFIX + table + ':'
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(tablePrefix)) keysToRemove.push(key)
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key))
  } catch {
    // noop
  }
}

// DB取得を優先し、失敗時はキャッシュへフォールバックする read-through ヘルパー
export async function cachedFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  try {
    const data = await fetcher()
    cacheSet(key, data)
    return data
  } catch (err) {
    const cached = cacheGet<T>(key)
    if (cached !== null) return cached
    throw err
  }
}
