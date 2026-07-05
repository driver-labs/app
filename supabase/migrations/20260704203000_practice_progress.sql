create table if not exists public.user_scenario_attempts (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id text not null,
  scenario_id text not null,
  started_at timestamptz not null,
  completed_at timestamptz,
  score integer not null check (score >= 0 and score <= 100),
  passed boolean not null default false,
  selected_answers jsonb not null default '[]'::jsonb,
  mistakes jsonb not null default '[]'::jsonb,
  lessons_practiced text[] not null default '{}',
  lessons_learned text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists user_scenario_attempts_user_module_idx
  on public.user_scenario_attempts (user_id, module_id, created_at desc);

create index if not exists user_scenario_attempts_user_scenario_idx
  on public.user_scenario_attempts (user_id, scenario_id, created_at desc);

alter table public.user_scenario_attempts enable row level security;

drop policy if exists "Users can read own scenario attempts"
  on public.user_scenario_attempts;

create policy "Users can read own scenario attempts"
  on public.user_scenario_attempts
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own scenario attempts"
  on public.user_scenario_attempts;

create policy "Users can insert own scenario attempts"
  on public.user_scenario_attempts
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

grant select, insert on table public.user_scenario_attempts to authenticated;
grant select, insert, update, delete on table public.user_scenario_attempts to service_role;

create table if not exists public.user_module_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id text not null,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'completed', 'mastered')),
  progress_percent integer not null default 0
    check (progress_percent >= 0 and progress_percent <= 100),
  total_scenarios integer not null default 1 check (total_scenarios >= 0),
  completed_scenarios integer not null default 0 check (completed_scenarios >= 0),
  attempts_count integer not null default 0 check (attempts_count >= 0),
  best_score integer check (best_score is null or (best_score >= 0 and best_score <= 100)),
  last_score integer check (last_score is null or (last_score >= 0 and last_score <= 100)),
  lessons_practiced text[] not null default '{}',
  lessons_learned text[] not null default '{}',
  first_started_at timestamptz,
  last_practiced_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, module_id)
);

create index if not exists user_module_progress_user_status_idx
  on public.user_module_progress (user_id, status);

alter table public.user_module_progress enable row level security;

drop policy if exists "Users can read own module progress"
  on public.user_module_progress;

create policy "Users can read own module progress"
  on public.user_module_progress
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own module progress"
  on public.user_module_progress;

create policy "Users can insert own module progress"
  on public.user_module_progress
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own module progress"
  on public.user_module_progress;

create policy "Users can update own module progress"
  on public.user_module_progress
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update on table public.user_module_progress to authenticated;
grant select, insert, update, delete on table public.user_module_progress to service_role;
