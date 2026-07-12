# コードベース改善点まとめ

調査日: 2026-06-25 / 最終更新: 2026-07-12

---

## 残課題（優先度順、見送り中）

### A. 日付フォーマットの重複実装（優先度: 中、費用対効果高）

「M月D日（曜）」形式の日付フォーマットが3箇所で個別実装されている。いずれも独自に `['日','月','火','水','木','金','土']` 配列を保持:
- `src/components/HomeTab.tsx:250`
- `src/components/TransactionDetailView.tsx:11-12`
- `src/components/CalendarTab.tsx:273-276`

**改善案:** `utils.ts` に `formatDateWithWeekday(dateStr)` を追加して3箇所を統合する。小さい変更で確実に重複を減らせる。

---

### B. useSummaryCalculations の単体テスト（優先度: 中、費用対効果高）

予算進捗・週/月別集計などの計算ロジックが集約されている `useSummaryCalculations.ts` にテストがない。Supabaseのモックが不要な純粋関数に近いフックのため、`RecordTab`/`SummaryTab`（D項目）よりも低コストでテスト追加できる。

**改善案:** `useSummaryCalculations.test.ts` を追加し、`aggregateOneTimeByCategory` や `oneTimeCategoryRows` の集計結果を中心に検証する。

---

### C. 他コンポーネントのフォーカスリング（優先度: 低）

`RecordTab`・`FixedExpenseForm`・`ConsumableForm` 等のボタン群に `focus:ring-*` が当たっていない箇所がある。具体例（2026-07-12再調査）: `CalendarTab.tsx` の日付セルボタン（L151-159）、区分選択ボタン（L208-215）、予定リストボタン（L232-236）、削除/キャンセル/保存ボタン（L422-443）。`<input>` 系は `focus:ring-2` が概ね付与済みだが、ボタン単位ではまだ穴が多い。

**見送り理由:** 主要ユーザーフロー（AuthScreen・フォーム入力欄）は対応済み。全ボタン対応は UI スタイルガイド整備とあわせて行う。

---

### D. RecordTab / SummaryTab のコンポーネントテスト（優先度: 低）

- `RecordTab` — フォーム送信・バリデーション
- `SummaryTab` — 月別集計値の正確性

**見送り理由:** Supabase サービス層のモックが必要で実装コストが高い。utils.ts・サービス層・AuthScreen のテストで基盤は整備済み。

---

### E. サービス層のテストカバレッジ偏り（優先度: 低）

`transactionService`（4件）・`fixedExpenseService`（7件）のみテストがあり、`calendarEventService.ts` / `workScheduleService.ts` / `shoppingMemoService.ts` / `wishlistService.ts` / `budgetService.ts` / `consumableService.ts` はテスト0件。

**見送り理由:** 優先度は B・D より低い。機能追加のタイミングで併せて追加するのが効率的。

---

### F. 依然として大きいファイル（優先度: 低）

`CalendarTab.tsx`（449行）、`FixedExpenseForm.tsx`（402行）、`FixedExpenseList.tsx`（397行）。`CalendarTab.tsx` は本体と `EventForm`（モーダル、L279-449）が同居しており `calendarTab/EventForm.tsx` への切り出しが可能。`FixedExpenseForm`/`List` は単一責務のフォーム/リストで、`FixedExpenseTutorial.tsx` のような明確な複数ステップ構造ではないため分割の価値は薄い。

**見送り理由:** `FixedExpenseTutorial.tsx`（946行）ほどの緊急性はない。`CalendarTab.tsx` の `EventForm` 切り出しは着手コストが低く次点候補。

---

### G. React.memo 未使用によるリスト再描画（優先度: 低）

プロジェクト全体で `React.memo` が使われていない。`ConsumablesList.tsx`（336行）や `FixedExpenseList.tsx` は親の再レンダリングのたびに全行を再計算・再描画する可能性がある。

**見送り理由:** 現状の項目数（家庭用アプリの想定規模）ではパフォーマンス上の実害は出ていない。件数が増えるユースケースが出てきたら行コンポーネントへの `memo` 適用を検討する。

---

### H. localStorage キーがユーザーID非依存（優先度: 低、要方針確認）

カテゴリ設定（`useCategories.ts`）・支払い方法（`usePaymentMethods.ts`）・為替レート（`exchangeRate.ts`）が `localStorage` にグローバルキー（例: `moneylog_expense_categories`）で保存されている。同一ブラウザを複数アカウントで使い回すと前ユーザーの設定が漏れる・混在する可能性がある。

**見送り理由:** 現状は単一ユーザー専用デバイス利用が前提。マルチアカウント利用を想定する場合はキーに `userId` を含める方針に変更する。

---

### I. Props drilling → React Context（優先度: 低）

`src/App.tsx` で `userId` と `categories` が全タブに手渡しされている。将来的に React Context でまとめると拡張しやすい。

```typescript
// src/contexts/AppContext.tsx
export const AppContext = createContext<{ userId: string; categories: Categories }>()
```

**見送り理由:** 現在の props 数が許容範囲内。タブ追加など拡張時に対応する。

---

### J. clsx / tailwind-merge 導入（優先度: 低）

複数箇所で `className={'... ' + (cond ? '...' : '...')}` パターンが使われており、`clsx` または `tailwind-merge` を導入すると可読性が上がる。

**見送り理由:** 新依存ライブラリの追加を伴う。現状の文字列連結で動作に問題なし。

---

### K. useAsync フック（優先度: 低）

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

## 良好な点（変更不要）

- TypeScript strict mode が適切に設定されている
- Vitest + @testing-library によるテスト基盤が整備されている
- サービス層（`src/lib/services/`）が Supabase 操作を集約し、エラー throw 済み
- `src/utils.ts` のユーティリティ関数は高カバレッジでテスト済み
- `useAuth`, `useCategories`, `useForm` の適切な抽象化
- `src/components/ui/` に TabGroup, Row, MonthSwitcher, ProgressBar が共通化されている
- AGENTS.md にプロジェクト規約が明記されており、設計方針が明確
