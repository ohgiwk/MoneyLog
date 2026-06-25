-- ============================================================
-- マネログ（MoneyLog） — Supabase Schema
-- Supabase の SQL Editor にそのまま貼り付けて実行してください
-- ============================================================

-- profiles
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  income_type text not null default 'fixed' check (income_type in ('fixed', 'hourly')),
  monthly_income numeric,
  hourly_wage numeric,
  expected_work_days numeric,
  created_at timestamptz not null default now()
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

-- fixed_expenses
create table public.fixed_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  category text not null,
  amount numeric not null,
  baseline_amount numeric not null,
  cycle text not null check (cycle in ('daily', 'weekly', 'monthly', 'yearly')),
  billing_day int,
  status text not null default 'active' check (status in ('active', 'reviewing', 'cancelled')),
  start_date date not null,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.fixed_expenses enable row level security;
create policy "own fixed_expenses" on public.fixed_expenses for all using (auth.uid() = user_id);

-- recurring_rules
create table public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  category text not null,
  estimated_amount numeric not null,
  recurrence_type text not null check (recurrence_type in ('daily', 'weekly', 'monthly', 'yearly')),
  recurrence_interval int not null default 1,
  start_date date not null,
  next_date date not null,
  auto_record boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.recurring_rules enable row level security;
create policy "own recurring_rules" on public.recurring_rules for all using (auth.uid() = user_id);

-- transactions
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  type text not null check (type in ('income', 'expense')),
  expense_kind text check (expense_kind in ('routine', 'one_time')),
  date date not null,
  category text not null,
  amount numeric not null,
  memo text,
  recurring_rule_id uuid references public.recurring_rules on delete set null,
  created_at timestamptz not null default now()
);
alter table public.transactions enable row level security;
create policy "own transactions" on public.transactions for all using (auth.uid() = user_id);
create index on public.transactions (user_id, date);

-- shopping_lists
create table public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  planned_date date not null,
  status text not null default 'open' check (status in ('open', 'done')),
  total_budget numeric not null default 0,
  total_actual numeric,
  created_at timestamptz not null default now()
);
alter table public.shopping_lists enable row level security;
create policy "own shopping_lists" on public.shopping_lists for all using (auth.uid() = user_id);

-- shopping_items
create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.shopping_lists on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  category text not null,
  budget_amount numeric not null,
  actual_amount numeric,
  status text not null default 'pending' check (status in ('pending', 'bought', 'skipped')),
  is_template boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.shopping_items enable row level security;
create policy "own shopping_items" on public.shopping_items for all using (auth.uid() = user_id);

-- wishlist_items
create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  target_amount numeric not null,
  priority int not null default 1,
  purchased_at date,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.wishlist_items enable row level security;
create policy "own wishlist_items" on public.wishlist_items for all using (auth.uid() = user_id);

-- savings_goals
create table public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  wishlist_item_id uuid references public.wishlist_items on delete set null,
  target_amount numeric not null,
  monthly_target numeric not null,
  deadline date,
  created_at timestamptz not null default now()
);
alter table public.savings_goals enable row level security;
create policy "own savings_goals" on public.savings_goals for all using (auth.uid() = user_id);

-- monthly_adjustments
create table public.monthly_adjustments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  savings_goal_id uuid not null references public.savings_goals on delete cascade,
  year_month text not null,
  amount numeric not null,
  memo text,
  created_at timestamptz not null default now()
);
alter table public.monthly_adjustments enable row level security;
create policy "own monthly_adjustments" on public.monthly_adjustments for all using (auth.uid() = user_id);

-- work_schedule
create table public.work_schedule (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  date date not null,
  day_type text not null check (day_type in ('work', 'off', 'holiday')),
  hours_worked numeric,
  hourly_wage numeric,
  daily_income numeric,
  memo text,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);
alter table public.work_schedule enable row level security;
create policy "own work_schedule" on public.work_schedule for all using (auth.uid() = user_id);

-- consumables（消耗品費）
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

-- profiles に同居人数カラムを追加
alter table public.profiles add column if not exists household_members int not null default 1;

-- transactions の expense_kind に 'consumable' を追加
alter table public.transactions
  drop constraint if exists transactions_expense_kind_check;
alter table public.transactions
  add constraint transactions_expense_kind_check
  check (expense_kind in ('routine', 'consumable', 'one_time'));

-- income_records
create table public.income_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  year_month text not null,
  expected_income numeric not null,
  actual_income numeric,
  work_days_expected int not null,
  work_days_actual int,
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, year_month)
);
alter table public.income_records enable row level security;
create policy "own income_records" on public.income_records for all using (auth.uid() = user_id);
