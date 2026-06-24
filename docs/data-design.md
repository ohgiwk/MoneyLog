# マネログ（MoneyLog） — データ設計

## テーブル一覧

```
認証（Supabase管理）
└── auth.users .............. ユーザー（メール・Google認証）

アプリデータ（自分で設計）
├── profiles ................ ユーザー設定・収入情報
├── fixed_expenses .......... 固定費
├── recurring_rules ......... 繰り返しルール（変動ルーチン費）
├── transactions ............ 実際の収支記録
├── wishlist_items .......... 欲しいものリスト
└── savings_goals ........... 貯金目標
```

---

## 各テーブルの詳細

### 1. profiles（ユーザー設定）

| カラム名 | 型 | 説明 |
|---|---|---|
| id | uuid | ユーザーID（auth.usersと連動） |
| income_type | text | 収入タイプ `fixed`（固定月収）/ `hourly`（時給制） |
| monthly_income | number | 固定月収額 |
| hourly_wage | number | 時給 |
| expected_work_days | number | 月の想定稼働日数 |
| created_at | timestamp | 作成日時 |

---

### 2. fixed_expenses（固定費）

固定費ひとつひとつを登録するテーブル。節約額を計算するために「最初の金額」も保存する。

| カラム名 | 型 | 説明 |
|---|---|---|
| id | uuid | 固定費ID |
| user_id | uuid | どのユーザーの固定費か |
| name | text | 名前（例：Netflix、家賃） |
| category | text | カテゴリ（通信費・住居費など） |
| amount | number | 現在の金額（円） |
| baseline_amount | number | **最初に登録した金額**（節約額計算の基準） |
| cycle | text | 支払いサイクル `monthly` / `yearly` / `weekly` など |
| billing_day | number | 引き落とし日（例：25 → 毎月25日） |
| status | text | `active`（契約中）/ `reviewing`（見直し中）/ `cancelled`（解約済み） |
| start_date | date | 登録開始日 |
| notes | text | メモ |
| created_at | timestamp | 作成日時 |

**節約額の計算イメージ**
```
月間節約額 = baseline_amount - amount
年間節約額 = 月間節約額 × 12
累計節約額 = 月間節約額 × 経過月数
```

---

### 3. recurring_rules（繰り返しルール）

「毎週月曜に食費3,000円」のような繰り返しパターンを登録するテーブル。

| カラム名 | 型 | 説明 |
|---|---|---|
| id | uuid | ルールID |
| user_id | uuid | ユーザーID |
| name | text | ルール名（例：週の食費、電気代） |
| category | text | カテゴリ |
| estimated_amount | number | 想定金額 |
| recurrence_type | text | 繰り返し種別（下記参照） |
| recurrence_interval | number | 間隔（例：2週おきなら2） |
| start_date | date | 開始日 |
| next_date | date | 次回予定日（自動計算して更新） |
| auto_record | boolean | true=自動記録 / false=手動確認 |
| is_active | boolean | ルールが有効かどうか |
| created_at | timestamp | 作成日時 |

**recurrence_typeの選択肢**
```
daily    毎日
weekly   毎週（recurrence_interval=1なら毎週、2なら隔週）
monthly  毎月（recurrence_interval=1なら毎月、2なら隔月）
yearly   毎年
```

---

### 4. transactions（収支記録）

実際に記録された収支の一覧。過去の記録はすべてここに入る。

| カラム名 | 型 | 説明 |
|---|---|---|
| id | uuid | 記録ID |
| user_id | uuid | ユーザーID |
| type | text | `income`（収入）/ `expense`（支出） |
| expense_kind | text | `routine`（ルーチン費）/ `one_time`（臨時費）/ null（収入の場合） |
| date | date | 日付 |
| category | text | カテゴリ |
| amount | number | 金額 |
| memo | text | メモ |
| recurring_rule_id | uuid | 繰り返しルールから生成された場合はそのID、手動入力はnull |
| created_at | timestamp | 作成日時 |

---

### 5. wishlist_items（欲しいものリスト）

| カラム名 | 型 | 説明 |
|---|---|---|
| id | uuid | アイテムID |
| user_id | uuid | ユーザーID |
| name | text | 商品名（例：カメラ、旅行積立） |
| target_amount | number | 目標金額 |
| priority | number | 優先順位（1が最高） |
| purchased_at | date | 購入日（nullなら未購入） |
| notes | text | メモ |
| created_at | timestamp | 作成日時 |

---

### 6. savings_goals（貯金目標）

欲しいものに対して「いつまでに・毎月いくら貯める」を管理するテーブル。

| カラム名 | 型 | 説明 |
|---|---|---|
| id | uuid | 目標ID |
| user_id | uuid | ユーザーID |
| wishlist_item_id | uuid | 対応する欲しいものID |
| target_amount | number | 目標金額 |
| saved_amount | number | 現在の貯金額（手動更新 or 収支から自動計算） |
| monthly_target | number | 毎月の目標積立額 |
| deadline | date | 目標達成期限（任意） |
| created_at | timestamp | 作成日時 |

**貯金額の計算ロジック**
```
実効貯金額 = Σ(月次収支の余剰) + Σ(monthly_adjustments.amount)
```

---

---

### 7. monthly_adjustments（貯金の手動調整）

自動計算された余剰に対して、実態に合わせた差分を記録する。

| カラム名 | 型 | 説明 |
|---|---|---|
| id | uuid | - |
| user_id | uuid | - |
| savings_goal_id | uuid | 対象の貯金目標 |
| year_month | text | 対象月（例：`2026-06`） |
| amount | number | 調整額（正＝追加、負＝減額） |
| memo | text | 理由（例：「先月分の未入力分を補正」） |
| created_at | timestamp | - |


---

## セキュリティ（Row Level Security）

SupabaseにはRLS（行レベルセキュリティ）という仕組みがある。  
「自分のデータは自分しか見られない」をDBレベルで保証できる。

全テーブルに以下のルールを設定する：
- **SELECT / INSERT / UPDATE / DELETE**：`user_id = auth.uid()` のみ許可

---

---

### 8. shopping_lists（買い物リスト）

買い物セッション単位で管理するテーブル。

| カラム名 | 型 | 説明 |
|---|---|---|
| id | uuid | - |
| user_id | uuid | - |
| name | text | リスト名（例：スーパー、薬局） |
| planned_date | date | 予定日 |
| status | text | `open`（未購入）/ `done`（記録済み） |
| total_budget | number | アイテムの予算合計（自動集計） |
| total_actual | number | 実際の合計（記録時に確定） |
| created_at | timestamp | - |

---

### 9. shopping_items（買い物アイテム）

shopping_listsに紐づく個々のアイテム。

| カラム名 | 型 | 説明 |
|---|---|---|
| id | uuid | - |
| list_id | uuid | 対応する買い物リストID |
| user_id | uuid | - |
| name | text | 商品名（例：牛乳、シャンプー） |
| category | text | カテゴリ（記録時にそのままtransactionsへ） |
| budget_amount | number | 予算額 |
| actual_amount | number | 実際の金額（チェック時に編集可） |
| status | text | `pending`（未購入）/ `bought`（購入済み）/ `skipped`（今回は不要） |
| is_template | boolean | テンプレートとして次回も使うか |
| sort_order | number | 並び順 |
| created_at | timestamp | - |

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

### 10. work_schedule（勤務カレンダー）

日ごとの勤務状況を記録。カレンダー表示と収入計算の両方に使う。  
時給・勤務時間もここで記録するため、過去の実績が変更後の設定に影響されない。

| カラム名 | 型 | 説明 |
|---|---|---|
| id | uuid | - |
| user_id | uuid | - |
| date | date | 対象日 |
| day_type | text | `work`（出勤）/ `off`（休み）/ `holiday`（祝日・有給） |
| hours_worked | number | 実際の労働時間（nullable） |
| hourly_wage | number | **その日の時給をスナップショット**（時給が変わっても過去実績を保持） |
| daily_income | number | `hours_worked × hourly_wage`（記録時に計算して保存） |
| memo | text | メモ（例：「午前のみ」） |
| created_at | timestamp | - |

---

### 11. income_records（月次収入サマリー）

月次で収入の予測と実績を比較するためのサマリーテーブル。  
work_scheduleの集計でも出せるが、給与振込額と計算値のズレを記録するためにも使う。

| カラム名 | 型 | 説明 |
|---|---|---|
| id | uuid | - |
| user_id | uuid | - |
| year_month | text | 対象月（`2026-06`） |
| expected_income | number | 予測収入（profiles設定から月初に計算） |
| actual_income | number | 実際の支給額（振込確認後に入力） |
| work_days_expected | number | 想定稼働日数 |
| work_days_actual | number | 実際の稼働日数（work_scheduleから集計） |
| notes | text | メモ |
| created_at | timestamp | - |

---

## テーブル間の関係図

```
auth.users
    │
    ├── profiles（1対1）
    │
    ├── fixed_expenses（1対多）
    │
    ├── recurring_rules（1対多）
    │       │
    │       └── transactions（繰り返しから生成された記録）
    │
    ├── transactions（1対多）
    │
    ├── shopping_lists（1対多）
    │       │
    │       └── shopping_items（1対多）→ transactions へ一括登録
    │
    ├── work_schedule（1対多）← カレンダー表示・収入実績
    │
    ├── income_records（1対多）← 月次収入の予測vs実績
    │
    ├── wishlist_items（1対多）
    │       │
    │       └── savings_goals（1対1）
    │                   │
    │                   └── monthly_adjustments（1対多）
    │
    └── savings_goals（1対多）
            │
            └── monthly_adjustments（1対多）
```
