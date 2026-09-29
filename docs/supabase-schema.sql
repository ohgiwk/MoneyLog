-- ============================================================
-- マネログ（MoneyLog） — Supabase Schema
--
-- 本番DB（public スキーマ）の現在の状態をまとめた定義。
-- 新しい環境では Supabase の SQL Editor にそのまま貼り付けて実行する。
--
-- スキーマを変更したときは、既存DB向けの ALTER 文を実行したうえで、
-- このファイルも「変更後の状態」に書き換えること（ALTER 文を末尾に追記しない）。
-- 本番DBとの差分は次のコマンドで確認できる:
--   supabase db dump --linked --schema public
-- ============================================================

-- ------------------------------------------------------------
-- profiles（ユーザー設定）
-- ------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  income_type text not null default 'fixed',
  monthly_income numeric,
  hourly_wage numeric,
  expected_work_days numeric,
  household_members int not null default 1,
  -- 月の開始日（1〜28。ホーム画面/記録タブの集計期間の起点）
  month_start_day int not null default 1,
  created_at timestamptz not null default now(),
  constraint profiles_income_type_check check (income_type in ('fixed', 'hourly')),
  constraint profiles_month_start_day_check check (month_start_day >= 1 and month_start_day <= 28)
);
alter table public.profiles enable row level security;
create policy "own profile" on public.profiles for all using (auth.uid() = id);

-- ユーザー登録時に自動でprofileを作成するトリガー
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- fixed_expenses（固定費）
-- ------------------------------------------------------------
create table public.fixed_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  category text not null,
  -- 円換算の金額（null は未入力。ローンは総額）
  amount numeric,
  baseline_amount numeric not null,
  cycle text not null,
  billing_day int,
  status text not null default 'active',
  start_date date not null,
  notes text,
  -- USD 入力時: currency = 'USD'、usd_amount に入力額（amount は保存時のレートで円換算）
  currency text,
  usd_amount numeric,
  -- ローン: 開始月・終了月（YYYY-MM）。分割回数は開始月〜終了月の月数
  loan_start_month text,
  loan_end_month text,
  created_at timestamptz not null default now(),
  constraint fixed_expenses_cycle_check check (cycle in ('daily', 'weekly', 'monthly', 'yearly')),
  constraint fixed_expenses_status_check
    check (status in ('active', 'reviewing', 'cancelled', 'unsubscribed'))
);
alter table public.fixed_expenses enable row level security;
create policy "own fixed_expenses" on public.fixed_expenses for all using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- transactions（収支記録）
-- ------------------------------------------------------------
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  type text not null,
  expense_kind text,
  date date not null,
  category text not null,
  amount numeric not null,
  memo text,
  -- 店舗種別（出費記録時の任意項目）
  store_type text,
  -- 食事タイプ（食費カテゴリ選択時の任意項目: 朝食/昼食/夕食/飲み物/その他）
  meal_type text,
  -- 支払い方法: payment_type = 'cash' | 'credit_card' | 'emoney' | 'qr'、
  -- payment_method = 具体的なサービス名（例: 楽天カード、PayPay）
  payment_type text,
  payment_method text,
  created_at timestamptz not null default now(),
  constraint transactions_type_check check (type in ('income', 'expense')),
  constraint transactions_expense_kind_check
    check (expense_kind in ('routine', 'consumable', 'one_time'))
);
alter table public.transactions enable row level security;
create policy "own transactions" on public.transactions for all using (auth.uid() = user_id);
create index transactions_user_id_date_idx on public.transactions (user_id, date);

-- ------------------------------------------------------------
-- consumables（消耗品費）
-- ------------------------------------------------------------
create table public.consumables (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  category text not null,
  amount numeric not null,
  quantity int not null default 1,
  cycle_days int not null,
  members_scale boolean not null default false,
  last_purchased date not null,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.consumables enable row level security;
create policy "own consumables" on public.consumables for all using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- budgets（月ごとの予算設定。デバイス間で共有するためDBに保存）
-- ------------------------------------------------------------
create table public.budgets (
  user_id uuid not null references auth.users on delete cascade,
  month text not null, -- YYYY-MM
  income numeric not null default 0,
  fixed numeric not null default 0,
  consumable numeric not null default 0,
  savings numeric not null default 0,
  one_time_by_category jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id, month)
);
alter table public.budgets enable row level security;
create policy "own budgets" on public.budgets for all using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- user_categories（カテゴリカスタマイズ設定。デバイス間で共有するためDBに保存）
-- ------------------------------------------------------------
create table public.user_categories (
  user_id uuid not null references auth.users on delete cascade,
  type text not null,
  categories jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, type),
  constraint user_categories_type_check check (type in ('expense', 'income', 'fixed'))
);
alter table public.user_categories enable row level security;
create policy "own user_categories" on public.user_categories for all using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- shopping_lists / shopping_items（買い物メモ）
-- ------------------------------------------------------------
create table public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  planned_date date not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  constraint shopping_lists_status_check check (status in ('open', 'done')),
  -- 子テーブルが (id, user_id) で参照し、親子の所有者を一致させるため
  constraint shopping_lists_id_user_id_key unique (id, user_id)
);
alter table public.shopping_lists enable row level security;
create policy "own shopping_lists" on public.shopping_lists for all using (auth.uid() = user_id);

create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null,
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  category text not null,
  budget_amount numeric not null,
  actual_amount numeric,
  memo text,
  status text not null default 'pending',
  is_template boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  constraint shopping_items_status_check check (status in ('pending', 'bought', 'skipped')),
  constraint shopping_items_list_id_user_id_fkey foreign key (list_id, user_id)
    references public.shopping_lists (id, user_id) on delete cascade
);
alter table public.shopping_items enable row level security;
create policy "own shopping_items" on public.shopping_items for all using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- wishlist_items / savings_goals（欲しいもの・貯金目標）
-- ------------------------------------------------------------
create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  target_amount numeric not null,
  priority int not null default 1,
  purchased_at date,
  target_date date,
  notes text,
  created_at timestamptz not null default now(),
  constraint wishlist_items_id_user_id_key unique (id, user_id)
);
alter table public.wishlist_items enable row level security;
create policy "own wishlist_items" on public.wishlist_items for all using (auth.uid() = user_id);

create table public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  wishlist_item_id uuid,
  target_amount numeric not null,
  monthly_target numeric not null,
  deadline date,
  created_at timestamptz not null default now(),
  -- 欲しいものの削除時は参照だけを外す（user_id は残す）
  constraint savings_goals_wishlist_item_id_user_id_fkey foreign key (wishlist_item_id, user_id)
    references public.wishlist_items (id, user_id) on delete set null (wishlist_item_id)
);
alter table public.savings_goals enable row level security;
create policy "own savings_goals" on public.savings_goals for all using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- calendar_events（予定。勤務の区分は日付に紐づくため work_schedule で管理）
-- ------------------------------------------------------------
create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  date date not null,
  -- 終了日（日を跨ぐ予定用。null なら date の1日のみ）
  end_date date,
  title text not null,
  start_time time,
  end_time time,
  -- 予定出費の明細（[{ "label": string, "amount": number }]）。合計は明細から求める
  expense_items jsonb not null default '[]'::jsonb,
  memo text,
  created_at timestamptz not null default now()
);
alter table public.calendar_events enable row level security;
create policy "Users can manage their own calendar events" on public.calendar_events
  for all using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- workplaces（勤務先。start_date 以降の日付はこの勤務先の区分を使う。null は「はじめから」）
-- ------------------------------------------------------------
create table public.workplaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  start_date date,
  created_at timestamptz not null default now(),
  constraint workplaces_id_user_id_key unique (id, user_id)
);
alter table public.workplaces enable row level security;
create policy "own workplaces" on public.workplaces for all using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- shift_types（勤務先ごとのカレンダー区分。削除は archived で非表示にし、過去の記録は残す）
-- kind: work=出勤1日 / half=半休（出勤0.5日・休日0.5日）/ off=休日1日 / other=集計しない
-- ------------------------------------------------------------
create table public.shift_types (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  workplace_id uuid not null,
  name text not null,
  kind text not null default 'work',
  -- 勤務時間帯（[{ "start": "HH:MM", "end": "HH:MM" }]。中抜け勤務は複数、時間なしは空配列）
  time_ranges jsonb not null default '[]'::jsonb,
  color text not null default 'primary',
  sort_order int not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  constraint shift_types_kind_check check (kind in ('work', 'half', 'off', 'other')),
  constraint shift_types_id_user_id_key unique (id, user_id),
  constraint shift_types_workplace_id_user_id_fkey foreign key (workplace_id, user_id)
    references public.workplaces (id, user_id) on delete cascade
);
alter table public.shift_types enable row level security;
create policy "own shift_types" on public.shift_types for all using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- work_schedule（日ごとの勤務カレンダー）
-- ------------------------------------------------------------
create table public.work_schedule (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  date date not null,
  -- 区分（勤務先ごとにユーザーが定義する）
  shift_type_id uuid,
  memo text,
  created_at timestamptz not null default now(),
  unique (user_id, date),
  -- 区分の削除時は参照だけを外す（user_id は残す）
  constraint work_schedule_shift_type_id_user_id_fkey foreign key (shift_type_id, user_id)
    references public.shift_types (id, user_id) on delete set null (shift_type_id)
);
alter table public.work_schedule enable row level security;
create policy "own work_schedule" on public.work_schedule for all using (auth.uid() = user_id);
