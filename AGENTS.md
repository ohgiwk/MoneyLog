# AGENTS.md — MoneyLog (マネログ)

エージェント（AI）がこのリポジトリで作業する際のルールと指針。

---

## プロジェクト概要

**マネログ** は「ルーチンをデザインして、お金の無駄をなくす家計簿」アプリ。
支出を固定費・変動ルーチン費・臨時費の3種に分類し、固定費の節約額を可視化するのがコアコンセプト。

---

## 技術スタック

| レイヤー | 技術 |
|----------|------|
| UI フレームワーク | React 18 + TypeScript |
| ビルドツール | Vite |
| スタイリング | Tailwind CSS |
| バックエンド | Supabase (PostgreSQL + Row Level Security) |
| 認証 | Supabase Auth (Email/Password + Google OAuth) |
| リンター | ESLint (typescript-eslint + react-hooks) |
| フォーマッター | Prettier |

---

## ディレクトリ構成

```
src/
  components/       # 画面・UIコンポーネント
    ui/             # 汎用UIパーツ（Button, Modal など）
    layout/         # レイアウト系（BottomNav など）
  hooks/            # カスタムフック（useAuth, useCategories など）
  lib/              # 外部サービスのクライアント（supabase.ts, database.types.ts）
  constants.ts      # アプリ全体の定数
  utils.ts          # ユーティリティ関数
docs/               # 設計ドキュメント（コンセプト・画面設計・DB設計）
```

---

## 開発コマンド

```bash
npm run dev          # 開発サーバー起動
npm run build        # ビルド (tsc + vite build)
npm run lint         # ESLint チェック
npm run lint:fix     # ESLint 自動修正
npm run format       # Prettier フォーマット (src/**/*.{ts,tsx,css})
npm run format:check # Prettier チェック
```

---

## 設計ドキュメント

UI・DB に関わる変更前に必ず参照する:

- `docs/concept.md` — アプリのコンセプトと機能仕様
- `docs/screen-design.md` — 画面設計
- `docs/data-design.md` — データ設計
- `docs/supabase-schema.sql` — DB スキーマ
- `docs/implementation-plan.md` — 実装計画

---

## 必須ルール

### Git 操作
- **`git commit` / `git push` はユーザーの明示的な指示があるまで実行しない。**
- ステージング (`git add`) も同様。作業完了を報告するに留める。

### ファイル変更の方針
- 既存ファイルの編集を優先し、不要な新規ファイルを作らない。
- リファクタリングや抽象化はタスクが明示的に要求している場合のみ行う。
- 自動生成ファイル (`src/lib/database.types.ts`) は手動編集しない。

### コードスタイル
- **TypeScript strict モード**を前提とする。`any` は原則禁止。
- コンポーネントは関数コンポーネント + hooks パターン。クラスコンポーネントは使わない。
- Tailwind クラスは `className` に直書き。CSS ファイルは `index.css` のグローバルスタイルのみ。
- コメントは「なぜそうするか」が非自明な箇所にのみ書く。「何をしているか」はコード自体で表現する。
- 変更後は `npm run lint` と `npm run format:check` を実行して問題がないことを確認する。

---

## 作業フロー

1. **要件確認**: タスクの内容と影響範囲を把握する。不明点はユーザーに確認する。
2. **設計ドキュメント参照**: UI/DB に関わる変更は `docs/` を必ず確認する。
3. **実装**: 最小限の変更でタスクを達成する。スコープ外の変更は加えない。
4. **検証**: lint / format を実行し、型エラーがないことを確認する。
5. **報告**: 変更内容を簡潔に報告する。コミットはしない。

---

## Supabase の扱い

- DB アクセスは `src/lib/supabase.ts` のクライアント経由でのみ行う。
- RLS (Row Level Security) が有効なので、認証状態を考慮した実装をする。
- スキーマ変更が必要な場合は `docs/supabase-schema.sql` を更新し、ユーザーに手動適用を促す。
- 環境変数は `.env.local` に設定し、コードにハードコードしない:
  ```
  VITE_SUPABASE_URL=...
  VITE_SUPABASE_ANON_KEY=...
  ```

---

## UIコンポーネントの方針

- 汎用パーツ（ボタン、モーダルなど）は `src/components/ui/` に置く。
- 画面単位のコンポーネントは `src/components/` 直下に置く (`*Screen.tsx`, `*Tab.tsx`)。
- レイアウト系は `src/components/layout/` に置く。
- スタイルは Tailwind クラスを `className` に直書きし、CSS ファイルを増やさない。

---

## セキュリティ

- `.env.local` の内容をコードにハードコードしない。
- XSS / SQL インジェクションに注意する（Supabase クライアントのパラメータバインドを使う）。
- ユーザー入力は画面の境界でバリデーションする。
