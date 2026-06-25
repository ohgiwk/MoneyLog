# コードベース改善点まとめ

調査日: 2026-06-25 / 最終更新: 2026-06-26

---

## 対応済みサマリー

| 優先度 | 項目 | 対応日 |
|--------|------|--------|
| 高 | RecordTab.tsx の分割（FixedExpenseList / Form, ConsumablesList / Form / Row） | 2026-06-25 |
| 高 | エラーハンドリング強化（サービス層 throw、try/catch、バリデーション表示） | 2026-06-25 |
| 高 | TabGroup / Row 汎用コンポーネント化 | 2026-06-25 |
| 中 | 型安全性（requireEnv、RecordSubPage 型アサーション除去、useEffect 依存配列） | 2026-06-25 |
| 中 | useForm カスタムフック作成・3フォームに適用 | 2026-06-25 |
| 中 | 計算ロジックを utils.ts に移動 | 2026-06-25 |
| 中 | パフォーマンス（O(n²)→Map、monthTx useMemo） | 2026-06-25 |
| 低〜中 | マジックナンバー定数化（HOUSEHOLD_MEMBERS_MIN/MAX 等） | 2026-06-25 |
| 低 | AuthScreen テスト追加（6テスト） | 2026-06-25 |
| 低 | AuthScreen アクセシビリティ（ARIA ラベル、focus:ring、role="tab"） | 2026-06-25 |

---

## 残課題（見送り中）

### A. useAsync フック（優先度: 低）

各コンポーネントで try/catch パターンが重複している。`useAsync` フックで共通化できる。

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

**見送り理由:** 現在の try/catch パターンで機能上問題なし。useAsync 化すると deps に eslint 抑制コメントが必要になる。

---

### B. clsx / tailwind-merge 導入（優先度: 低）

複数箇所で `className={'... ' + (cond ? '...' : '...')}` パターンが使われており、`clsx` または `tailwind-merge` を導入すると可読性が上がる。

**見送り理由:** 新依存ライブラリの追加を伴う。現状の文字列連結で動作に問題なし。

---

### C. Props drilling → React Context（優先度: 低）

`src/App.tsx` で `userId` と `categories` が全タブに手渡しされている。将来的に React Context でまとめると拡張しやすい。

```typescript
// src/contexts/AppContext.tsx
export const AppContext = createContext<{ userId: string; categories: Categories }>()
```

**見送り理由:** 現在の props 数が許容範囲内。タブ追加など拡張時に対応する。

---

### D. RecordTab / SummaryTab のコンポーネントテスト（優先度: 低）

- `RecordTab` — フォーム送信・バリデーション
- `SummaryTab` — 月別集計値の正確性

**見送り理由:** Supabase サービス層のモックが必要で実装コストが高い。utils.ts・サービス層・AuthScreen のテストで基盤は整備済み。

---

### E. 他コンポーネントのフォーカスリング（優先度: 低）

`RecordTab`・`FixedExpenseForm`・`ConsumableForm` 等のボタン群に `focus:ring-*` が当たっていない箇所がある。

**見送り理由:** 主要ユーザーフロー（AuthScreen・フォーム入力欄）は対応済み。全ボタン対応は UI スタイルガイド整備とあわせて行う。

---

## 良好な点（変更不要）

- TypeScript strict mode が適切に設定されている
- Vitest + @testing-library によるテスト基盤が整備されている
- サービス層（`src/lib/services/`）が Supabase 操作を集約し、エラー throw 済み
- `src/utils.ts` のユーティリティ関数は高カバレッジでテスト済み
- `useAuth`, `useCategories`, `useForm` の適切な抽象化
- `src/components/ui/` に TabGroup, Row, MonthSwitcher, ProgressBar が共通化されている
- AGENTS.md にプロジェクト規約が明記されており、設計方針が明確
