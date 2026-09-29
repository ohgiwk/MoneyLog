# マネログ（MoneyLog） — データ設計

## テーブル一覧

```
認証（Supabase管理）
└── auth.users .............. ユーザー（メール・Google認証）

アプリデータ（自分で設計）
├── profiles ................ ユーザー設定・収入情報・同居人数・月開始日
├── fixed_expenses .......... 固定費
├── consumables ............. 消耗品費（日用品・消耗品の購入サイクル管理）
├── transactions ............ 実際の収支記録
├── budgets ................. 月次予算設定
├── shopping_lists .......... 買い物リスト（セッション単位）
├── shopping_items .......... 買い物リストのアイテム
├── calendar_events ......... カレンダー予定
├── work_schedule ........... 勤務カレンダー（日ごとの区分・収入計算・勤怠実績）
├── workplaces .............. 勤務先（開始日付き）
├── shift_types ............. 勤務先ごとのカレンダー区分・勤務時間
├── user_categories ......... カテゴリのカスタマイズ設定
├── wishlist_items .......... 欲しいものリスト
└── savings_goals ........... 貯金目標
```

---

## ER図

```mermaid
erDiagram
    auth_users {
        uuid id PK
    }

    profiles {
        uuid id PK
        text income_type
        numeric monthly_income
        numeric hourly_wage
        numeric expected_work_days
        int household_members
        int month_start_day
        timestamptz created_at
    }

    fixed_expenses {
        uuid id PK
        uuid user_id FK
        text name
        text category
        numeric amount
        numeric baseline_amount
        text cycle
        int billing_day
        text status
        date start_date
        text notes
        text currency
        numeric usd_amount
        text loan_start_month
        text loan_end_month
        timestamptz created_at
    }

    consumables {
        uuid id PK
        uuid user_id FK
        text name
        text category
        numeric amount
        int quantity
        int cycle_days
        boolean members_scale
        date last_purchased
        text notes
        timestamptz created_at
    }

    transactions {
        uuid id PK
        uuid user_id FK
        text type
        text expense_kind
        date date
        text category
        numeric amount
        text memo
        text store_type
        text meal_type
        text payment_type
        text payment_method
        timestamptz created_at
    }

    budgets {
        uuid user_id FK
        text month
        numeric fixed
        numeric consumable
        numeric income
        numeric savings
        jsonb one_time_by_category
        timestamptz created_at
    }

    shopping_lists {
        uuid id PK
        uuid user_id FK
        text name
        date planned_date
        text status
        timestamptz created_at
    }

    shopping_items {
        uuid id PK
        uuid list_id FK
        uuid user_id FK
        text name
        text category
        numeric budget_amount
        numeric actual_amount
        text status
        text memo
        boolean is_template
        int sort_order
        timestamptz created_at
    }

    calendar_events {
        uuid id PK
        uuid user_id FK
        date date
        date end_date
        text title
        time start_time
        time end_time
        jsonb expense_items
        text memo
        timestamptz created_at
    }

    work_schedule {
        uuid id PK
        uuid user_id FK
        date date
        uuid shift_type_id FK
        text memo
        timestamptz created_at
    }

    workplaces {
        uuid id PK
        uuid user_id FK
        text name
        date start_date
        timestamptz created_at
    }

    shift_types {
        uuid id PK
        uuid user_id FK
        uuid workplace_id FK
        text name
        text kind
        jsonb time_ranges
        text color
        int sort_order
        boolean archived
        timestamptz created_at
    }

    user_categories {
        uuid user_id PK
        text type PK
        jsonb categories
        timestamptz updated_at
    }

    wishlist_items {
        uuid id PK
        uuid user_id FK
        text name
        numeric target_amount
        int priority
        date purchased_at
        date target_date
        text notes
        timestamptz created_at
    }

    savings_goals {
        uuid id PK
        uuid user_id FK
        uuid wishlist_item_id FK
        numeric target_amount
        numeric monthly_target
        date deadline
        timestamptz created_at
    }

    auth_users ||--|| profiles : "1:1"
    auth_users ||--o{ fixed_expenses : "1:N"
    auth_users ||--o{ consumables : "1:N"
    auth_users ||--o{ transactions : "1:N"
    auth_users ||--o{ budgets : "1:N"
    auth_users ||--o{ shopping_lists : "1:N"
    auth_users ||--o{ calendar_events : "1:N"
    auth_users ||--o{ work_schedule : "1:N"
    auth_users ||--o{ workplaces : "1:N"
    auth_users ||--o{ user_categories : "1:N"
    auth_users ||--o{ wishlist_items : "1:N"
    auth_users ||--o{ savings_goals : "1:N"
    shopping_lists ||--o{ shopping_items : "1:N"
    wishlist_items ||--o| savings_goals : "1:1"
    workplaces ||--o{ shift_types : "1:N"
    shift_types ||--o{ work_schedule : "区分"
```

---

## テーブル間の関係図

```
auth.users
    │
    ├── profiles（1対1）
    │       ↑ household_members を consumables が参照
    │       ↑ month_start_day をホーム/記録タブが参照
    │
    ├── fixed_expenses（1対多）
    │
    ├── consumables（1対多）
    │
    ├── transactions（1対多）
    │
    ├── budgets（1対多、user_id + month で複合主キー）
    │
    ├── shopping_lists（1対多）
    │       │
    │       └── shopping_items（1対多）→ transactions へ一括登録
    │
    ├── calendar_events（1対多）
    │
    ├── work_schedule（1対多）← カレンダー表示・収入実績
    │
    ├── workplaces（1対多）
    │       │
    │       └── shift_types（1対多）→ work_schedule.shift_type_id から参照
    │
    ├── user_categories（1対多、user_id + type で複合主キー）
    │
    ├── wishlist_items（1対多）
    │       │
    │       └── savings_goals（1対1）
    │
    └── savings_goals（1対多）
```

親子関係のある子テーブル（`shopping_items`・`shift_types`・`work_schedule`・`savings_goals`）は、親の `(id, user_id)` を複合外部キーで参照する。これにより、子の `user_id` が親の `user_id` と必ず一致する。

---

## 各テーブルの詳細

### 1. profiles（ユーザー設定）

| カラム名 | 型 | 説明 |
|---|---|---|
| id | uuid | ユーザーID（auth.usersと連動、PK） |
| income_type | text | 収入タイプ `fixed`（固定月収）/ `hourly`（時給制） |
| monthly_income | numeric | 固定月収額 |
| hourly_wage | numeric | 時給 |
| expected_work_days | numeric | 月の想定稼働日数 |
| household_members | int | 同居人数（消耗品費のサイクル計算に使用、デフォルト1） |
| month_start_day | int | 月の開始日（1〜28、ホーム/記録タブの集計期間の起点） |
| created_at | timestamptz | 作成日時 |

> ユーザー登録時に `handle_new_user` トリガーで自動作成される。

---

### 2. fixed_expenses（固定費）

固定費ひとつひとつを登録するテーブル。節約額を計算するために「最初の金額」も保存する。

| カラム名 | 型 | 説明 |
|---|---|---|
| id | uuid | 固定費ID |
| user_id | uuid | どのユーザーの固定費か |
| name | text | 名前（例：Netflix、家賃） |
| category | text | カテゴリ（通信費・住居費など） |
| amount | numeric | 現在の金額（円。null は未入力。ローンは総額） |
| baseline_amount | numeric | **最初に登録した金額**（節約額計算の基準） |
| cycle | text | 支払いサイクル `daily` / `weekly` / `monthly` / `yearly` |
| billing_day | int | 引き落とし日（例：25 → 毎月25日） |
| status | text | `active`（契約中）/ `reviewing`（見直し中）/ `unsubscribed`（未契約）/ `cancelled`（解約済み） |
| start_date | date | 登録開始日 |
| notes | text | メモ |
| currency | text | `USD` のとき入力額はドル（null は円） |
| usd_amount | numeric | ドル入力時の入力額（`amount` は保存時のレートで円換算した値） |
| loan_start_month | text | ローンの開始月（`YYYY-MM`） |
| loan_end_month | text | ローンの終了月（`YYYY-MM`。分割回数は開始月〜終了月の月数） |
| created_at | timestamptz | 作成日時 |

**節約額の計算イメージ**
```
月間節約額 = baseline_amount - amount
年間節約額 = 月間節約額 × 12
累計節約額 = 月間節約額 × 経過月数
```

---

### 3. consumables（消耗品費）

定期的に必ず購入する消耗品・日用品を品目単位で管理するテーブル。
`profiles.household_members` と連携して実効消費サイクルを計算する。

| カラム名 | 型 | 説明 |
|---|---|---|
| id | uuid | 消耗品ID |
| user_id | uuid | ユーザーID |
| name | text | 品目名（例：トイレットペーパー、歯ブラシ） |
| category | text | カテゴリ（衛生・清潔 / トイレ・洗剤 / サプリ・医療 / 食品 / その他） |
| amount | numeric | 単価（円） |
| quantity | int | 1回の購入個数（デフォルト1） |
| cycle_days | int | 基準消費サイクル（日数、例：60 = 2ヶ月おき） |
| members_scale | boolean | 同居人数に比例してサイクルを短縮するか（true=比例する） |
| last_purchased | date | 最終購入日（次回予定日の計算基準） |
| notes | text | メモ |
| created_at | timestamptz | 作成日時 |

**計算ロジック**
```
実効サイクル日数 = members_scale ? cycle_days ÷ household_members : cycle_days
次回購入予定日   = last_purchased + 実効サイクル日数
月額換算コスト   = (amount × quantity) ÷ (実効サイクル日数 ÷ 30)
```

---

### 4. transactions（収支記録）

実際に記録された収支の一覧。過去の記録はすべてここに入る。

| カラム名 | 型 | 説明 |
|---|---|---|
| id | uuid | 記録ID |
| user_id | uuid | ユーザーID |
| type | text | `income`（収入）/ `expense`（支出） |
| expense_kind | text | `routine`（変動ルーチン費）/ `consumable`（消耗品費）/ `one_time`（臨時出費）/ null（収入） |
| date | date | 日付 |
| category | text | カテゴリ |
| amount | numeric | 金額 |
| memo | text | メモ |
| store_type | text | 店舗種別（任意、例：スーパー・コンビニ・ドラッグストア・100円ショップ・家電量販店） |
| meal_type | text | 食事タイプ（食費カテゴリ時の任意項目：朝食/昼食/夕食/飲み物/その他） |
| payment_type | text | 支払い方法種別（`cash` / `credit_card` / `emoney` / `qr`） |
| payment_method | text | 支払いサービス名（例：楽天カード、PayPay） |
| created_at | timestamptz | 作成日時 |

> `(user_id, date)` にインデックスあり。

---

### 5. budgets（月次予算設定）

月ごとの予算を管理するテーブル。`(user_id, month)` が複合主キー。

| カラム名 | 型 | 説明 |
|---|---|---|
| user_id | uuid | ユーザーID（複合PK） |
| month | text | 対象月（例：`2026-07`、複合PK） |
| fixed | numeric | 固定費予算（円） |
| consumable | numeric | 消耗品費予算（円） |
| income | numeric | その月の収入（予算使用率の計算基準） |
| savings | numeric | その月の貯蓄額 |
| one_time_by_category | jsonb | カテゴリ別の臨時出費予算（例：`{"食費": 30000}`） |
| created_at | timestamptz | 作成日時 |

---

### 6. shopping_lists（買い物リスト）

買い物セッション単位で管理するテーブル。

| カラム名 | 型 | 説明 |
|---|---|---|
| id | uuid | リストID |
| user_id | uuid | ユーザーID |
| name | text | リスト名（例：スーパー、薬局） |
| planned_date | date | 予定日 |
| status | text | `open`（未購入）/ `done`（記録済み） |
| created_at | timestamptz | 作成日時 |

---

### 7. shopping_items（買い物アイテム）

shopping_listsに紐づく個々のアイテム。

| カラム名 | 型 | 説明 |
|---|---|---|
| id | uuid | アイテムID |
| list_id | uuid | 対応する買い物リストID |
| user_id | uuid | ユーザーID |
| name | text | 商品名（例：牛乳、シャンプー） |
| category | text | カテゴリ（記録時にそのままtransactionsへ） |
| budget_amount | numeric | 予算額 |
| actual_amount | numeric | 実際の金額（チェック時に編集可） |
| status | text | `pending`（未購入）/ `bought`（購入済み）/ `skipped`（今回は不要） |
| memo | text | アイテムメモ（任意） |
| is_template | boolean | テンプレートとして次回も使うか |
| sort_order | int | 並び順 |
| created_at | timestamptz | 作成日時 |

**買い物後の記録フロー**
```
1. shopping_items の status=bought のアイテムを取得
2. 各アイテムを transactions に一括 INSERT
   - amount = actual_amount（未入力なら budget_amount）
   - date   = shopping_lists.planned_date
   - category, memo = shopping_items の値
3. shopping_lists.status を done に更新
```

---

### 8. calendar_events（カレンダー予定）

日付に紐づく予定・イベントを記録するテーブル。勤務/休暇の区分は `work_schedule` で管理する。

| カラム名 | 型 | 説明 |
|---|---|---|
| id | uuid | イベントID |
| user_id | uuid | ユーザーID |
| date | date | 対象日（日を跨ぐ予定は開始日） |
| end_date | date | 終了日（null なら `date` の1日のみ） |
| title | text | イベントタイトル |
| start_time | time | 開始時刻（任意） |
| end_time | time | 終了時刻（任意） |
| expense_items | jsonb | 予定出費の明細（`[{ label, amount }]`）。予定出費の合計は明細から求める |
| memo | text | メモ |
| created_at | timestamptz | 作成日時 |

---

### 9. work_schedule（勤務カレンダー）

日ごとの勤務状況（区分）を記録。カレンダー表示と出勤・休日数の集計に使う。

| カラム名 | 型 | 説明 |
|---|---|---|
| id | uuid | - |
| user_id | uuid | - |
| date | date | 対象日（`user_id + date` でユニーク） |
| shift_type_id | uuid | 区分（shift_types.id）。勤務先ごとにユーザーが定義する |
| memo | text | メモ（例：「午前のみ」） |
| created_at | timestamptz | - |

---

#### workplaces（勤務先）

職場ごとにカレンダー区分を持たせるためのテーブル。日付に対して `start_date` が最も新しい（その日以前の）勤務先の区分がカレンダーに並ぶ。職場が変わったら新しい勤務先を追加するだけで、過去の日の区分・勤務時間は変わらない。

| カラム名 | 型 | 説明 |
|---|---|---|
| id | uuid | - |
| user_id | uuid | - |
| name | text | 勤務先名 |
| start_date | date | この日以降に適用（null は「はじめから」） |
| created_at | timestamptz | 作成日時 |

#### shift_types（カレンダー区分）

勤務先ごとにユーザーが追加・編集・削除できる区分。削除は `archived = true` にして選択肢から外すだけで、過去の記録からは参照し続ける。

| カラム名 | 型 | 説明 |
|---|---|---|
| id | uuid | - |
| user_id | uuid | - |
| workplace_id | uuid | 勤務先 |
| name | text | 区分名（例：勤務日・午前半休） |
| kind | text | 日数の数え方: `work`（出勤1日）/ `half`（出勤0.5日・休日0.5日）/ `off`（休日1日）/ `other`（集計しない） |
| time_ranges | jsonb | 勤務時間帯 `[{ start: "HH:MM", end: "HH:MM" }]`。中抜け勤務は複数、時間なしは空配列 |
| color | text | 表示色のキー |
| sort_order | int | 並び順 |
| archived | boolean | 削除済み（選択肢に出さない） |
| created_at | timestamptz | 作成日時 |

---

### 10. wishlist_items（欲しいものリスト）

| カラム名 | 型 | 説明 |
|---|---|---|
| id | uuid | アイテムID |
| user_id | uuid | ユーザーID |
| name | text | 商品名（例：カメラ、旅行積立） |
| target_amount | numeric | 目標金額 |
| priority | int | 優先順位（1が最高） |
| purchased_at | date | 購入日（nullなら未購入） |
| target_date | date | 購入目標日 |
| notes | text | メモ |
| created_at | timestamptz | 作成日時 |

---

### 11. savings_goals（貯金目標）

欲しいものに対して「いつまでに・毎月いくら貯める」を管理するテーブル。

| カラム名 | 型 | 説明 |
|---|---|---|
| id | uuid | 目標ID |
| user_id | uuid | ユーザーID |
| wishlist_item_id | uuid | 対応する欲しいものID（nullableで独立目標も可） |
| target_amount | numeric | 目標金額 |
| monthly_target | numeric | 毎月の目標積立額 |
| deadline | date | 目標達成期限（任意） |
| created_at | timestamptz | 作成日時 |

---

### 12. user_categories（カテゴリのカスタマイズ設定）

支出・収入・固定費のカテゴリ一覧をユーザーごとに保存する。デバイス間で共有するためDBに保存し、`(user_id, type)` が複合主キー。

| カラム名 | 型 | 説明 |
|---|---|---|
| user_id | uuid | ユーザーID（複合PK） |
| type | text | `expense` / `income` / `fixed`（複合PK） |
| categories | jsonb | カテゴリの配列（`[{ name, icon, color, enabled }]`） |
| updated_at | timestamptz | 更新日時 |

---

## セキュリティ（Row Level Security）

全テーブルに RLS（行レベルセキュリティ）を設定：
- **SELECT / INSERT / UPDATE / DELETE**：`user_id = auth.uid()` のみ許可
- `profiles` のみ `id = auth.uid()` で判定（user_id カラムがなく id が PK 兼外部キー）
- `budgets` は `(user_id, month)` 複合主キーで同様にポリシー適用済み
