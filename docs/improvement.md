# コードベース改善点まとめ

調査日: 2026-06-25

---

## 優先度別サマリー

| 優先度 | 項目 | 影響度 | 工数 |
|--------|------|--------|------|
| **高** | RecordTab.tsx の分割 | 保守性 | 大 |
| **高** | エラーハンドリング強化 | ユーザー体験 | 中 |
| **高** | TabGroup 汎用コンポーネント化 | DRY | 小 |
| **中** | 型安全性改善 | バグ予防 | 小 |
| **中** | カスタムフック追加 | テスト性 | 中 |
| **中** | useMemo/useCallback 活用 | パフォーマンス | 小 |
| **低** | コンポーネント単体テスト | カバレッジ | 大 |
| **低** | アクセシビリティ改善 | WCAG 準拠 | 中 |

---

## 1. コンポーネント責務分離（優先度: 高）

### 1.1 RecordTab.tsx が 1140 行で肥大化

`src/components/RecordTab.tsx` に 8 個の関数コンポーネントと複数の計算ロジックが混在している。

**問題箇所:**
- 行 56–260: `OneTimeExpenseForm`（フォーム状態・送信）
- 行 265–458: `FixedExpenseList`（一覧・フィルタ・チュートリアル統合）
- 行 483–905: `ConsumablesList`, `ConsumableRow`, `ConsumableForm`

**推奨構成:**
```
src/components/
  RecordTab/
    RecordTab.tsx             # 親コンポーネント（状態管理のみ）
    OneTimeExpenseForm.tsx
    FixedExpenseTab.tsx
    FixedExpenseList.tsx
    FixedExpenseForm.tsx
    ConsumablesTab.tsx
    ConsumablesList.tsx
    ConsumableForm.tsx
```

### 1.2 Row コンポーネントが 2 箇所で重複定義

`src/components/SummaryTab.tsx` 行 241–260 と `src/components/RecordTab.tsx` 行 460–478 に同一の Row コンポーネントが重複している。

**改善案:** `src/components/ui/Row.tsx` に共通化。

### 1.3 SummaryTab の Overview/DetailView 混在

`src/components/SummaryTab.tsx` 行 88–260 に Overview と DetailView の両モードが混在。将来的には `SummaryTab/` ディレクトリに分割すること。

---

## 2. エラーハンドリング欠如（優先度: 高）

### 2.1 サービス層が Supabase エラーを無視

すべてのサービスファイル（`src/lib/services/*.ts`）で `error` フィールドを捨てている。

```typescript
// 現状（src/lib/services/transactionService.ts 行 7–18）
const { data } = await supabase.from('transactions').select('*')...
return data ?? []

// 改善案
const { data, error } = await supabase.from('transactions').select('*')...
if (error) throw new Error(`読み込みエラー: ${error.message}`)
return data ?? []
```

### 2.2 非同期フェッチに try/catch なし

`src/components/RecordTab.tsx` 行 76–87 の `fetchFixedExpenses`, `fetchConsumables`, `fetchProfile` がすべてエラーを素通し。ネットワーク障害時にユーザーへ通知が行われない。

### 2.3 フォーム送信の検証失敗が無音

`src/components/RecordTab.tsx` 行 89–107 の `handleSubmit` は `if (!amt || amt <= 0) return` で無言リターンしており、ユーザーへのフィードバックがない。

---

## 3. タブ切り替え UI の重複（優先度: 高）

同じパターンが 3 箇所に重複している:

| ファイル | 行 | 用途 |
|----------|-----|------|
| `src/components/SummaryTab.tsx` | 48–62 | 概要/詳細 切り替え |
| `src/components/RecordTab.tsx` | 116–133 | 臨時/固定/消耗品 切り替え |
| `src/components/RecordTab.tsx` | 357–370 | ステータスフィルター |

**改善案:** `src/components/ui/TabGroup.tsx` を作成。

```typescript
interface TabGroupProps<T extends string> {
  tabs: { key: T; label: string }[]
  active: T
  onChange: (key: T) => void
  size?: 'sm' | 'md'
}

export function TabGroup<T extends string>({ tabs, active, onChange, size = 'md' }: TabGroupProps<T>) {
  return (
    <div className="flex rounded-xl bg-slate-100 p-1">
      {tabs.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`flex-1 py-2 rounded-lg ${size === 'sm' ? 'text-xs' : 'text-sm'} font-semibold transition ${
            active === key ? 'bg-white shadow text-slate-800' : 'text-slate-400'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
```

---

## 4. 型安全性の問題（優先度: 中）

### 4.1 型アサーションの多用

**`src/lib/supabase.ts` 行 3–4`**
```typescript
// 現状
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string

// 改善案
function requireEnv(name: string): string {
  const value = import.meta.env[name as keyof ImportMetaEnv]
  if (typeof value !== 'string') throw new Error(`${name} is not set`)
  return value
}
const supabaseUrl = requireEnv('VITE_SUPABASE_URL')
```

### 4.2 RecordSubPage の定義と配列が乖離

`src/components/RecordTab.tsx` 行 117 で `(['one_time', 'fixed', 'consumables'] as RecordSubPage[])` と型アサーションしているが、型定義と二重管理になっている。

```typescript
// 改善案
const RECORD_SUB_PAGES = ['one_time', 'fixed', 'consumables'] as const
type RecordSubPage = typeof RECORD_SUB_PAGES[number]
```

### 4.3 useEffect の依存配列が不完全

`src/components/RecordTab.tsx` 行 66–74 で `formCategories` が依存配列から漏れている。

---

## 5. カスタムフック不足（優先度: 中）

### 5.1 フォーム状態管理の重複

`OneTimeExpenseForm`, `FixedExpenseForm`, `ConsumableForm` がそれぞれ同じパターンで state を管理している。

**必要なフック:**

```typescript
// src/hooks/useForm.ts
export function useForm<T>(initialState: T) {
  const [values, setValues] = useState(initialState)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const reset = () => setValues(initialState)
  return { values, setValues, isSubmitting, setIsSubmitting, reset }
}
```

### 5.2 計算ロジックがコンポーネントに埋まっている

`src/components/RecordTab.tsx` 行 20–39 の `effectiveCycleDays`, `nextPurchaseDate`, `monthlyConsumableCost`, `daysUntil` はコンポーネント外の `src/lib/consumable.ts` に移動すべき。現状ではテストが困難。

### 5.3 非同期処理の共通化不足

データフェッチパターンが各コンポーネントで手動実装されている。

```typescript
// src/hooks/useAsync.ts
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  useEffect(() => {
    setLoading(true)
    fn().then(setData).catch(setError).finally(() => setLoading(false))
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps
  return { data, loading, error }
}
```

---

## 6. パフォーマンス問題（優先度: 中）

### 6.1 O(n²) のソート処理

`src/components/RecordTab.tsx` 行 292–308 で `categoryOrder.indexOf()` が毎回呼ばれており O(n²)。

```typescript
// 改善案
const categoryOrderMap = useMemo(
  () => new Map(fixedCategories.map((c, i) => [c.name, i])),
  [fixedCategories]
)
const filtered = useMemo(
  () =>
    fixedExpenses
      .filter((f) => f.status === filter)
      .sort((a, b) => (categoryOrderMap.get(a.category) ?? 999) - (categoryOrderMap.get(b.category) ?? 999)),
  [fixedExpenses, filter, categoryOrderMap]
)
```

### 6.2 monthTx が useMemo で保護されていない

`src/components/SummaryTab.tsx` 行 97–98 の `monthTx` が毎レンダーで再計算される。

```typescript
const monthTx = useMemo(
  () => transactions.filter((t) => monthKey(t.date) === month),
  [transactions, month]
)
```

### 6.3 Tailwind クラスの文字列連結

複数箇所で `className={'... ' + (cond ? '...' : '...')}` パターンが使われている。`clsx` または `tailwind-merge` の導入を検討。

---

## 7. ステート管理（優先度: 中）

### 7.1 Props drilling

`src/App.tsx` 行 98–111 で `userId` と `categories` が全タブに手渡しされている。将来的に React Context でまとめると拡張しやすい。

```typescript
// src/contexts/AppContext.tsx
export const AppContext = createContext<{ userId: string; categories: Categories }>()
```

---

## 8. マジックナンバー・マジックストリング（優先度: 低〜中）

| ファイル | 行 | 値 | 意味 |
|----------|----|----|------|
| `src/components/SettingsScreen.tsx` | 54, 67 | `1`, `10` | 世帯人数の最小・最大 |
| `src/components/RecordTab.tsx` | 513 | `7` | 消耗品の緊急閾値（日数） |
| `src/components/SettingsScreen.tsx` | 26 | `1500` | 保存成功メッセージ表示時間（ms） |

**改善案:** `src/constants.ts` に定数として定義する。

---

## 9. テスト不足（優先度: 低）

現在のカバレッジ:
- `src/utils.ts`: ほぼ完全 ✓
- `src/hooks/`: `useAuth`, `useCategories` のみ ✓
- `src/lib/services/`: 基本的なテスト ✓
- `src/components/`: **テストなし** ✗

優先して追加すべきテスト:
- `AuthScreen` — ログイン・登録・エラー表示
- `RecordTab` — フォーム送信・バリデーション
- `SummaryTab` — 月別集計値の正確性

---

## 10. アクセシビリティ（優先度: 低）

### 10.1 ARIA ラベル不足

`src/components/AuthScreen.tsx` の `<input type="email">` に `aria-label` がない。

### 10.2 フォーカスリングの欠如

多くのボタンに `focus:ring-*` スタイルが当たっていない。キーボードナビゲーション時に視覚的フォーカスが見えない。

### 10.3 コントラスト比

`src/components/RecordTab.tsx` 行 224 の `text-slate-200` は WCAG AA（4.5:1）を満たさない可能性がある。

---

## 良好な点（変更不要）

- TypeScript strict mode が適切に設定されている
- Vitest + @testing-library によるテスト基盤が整備されている
- サービス層（`src/lib/services/`）が Supabase 操作を集約している
- `src/utils.ts` のユーティリティ関数は高カバレッジでテスト済み
- `useAuth`, `useCategories` の適切な抽象化
- `src/components/ui/` に MonthSwitcher, ProgressBar が共通化されている
- AGENTS.md にプロジェクト規約が明記されており、設計方針が明確
