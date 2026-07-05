create table if not exists public.news_scenarios (
  id text primary key,
  definition jsonb not null,
  news_title text not null,
  news_url text not null,
  news_source text not null,
  news_published_at timestamptz,
  news_summary text,
  generation_mode text not null default 'overlay'
    check (generation_mode in ('overlay', 'new_simulation')),
  created_at timestamptz not null default now()
);

create index if not exists news_scenarios_news_url_idx
  on public.news_scenarios (news_url);

create index if not exists news_scenarios_created_at_idx
  on public.news_scenarios (created_at desc);

alter table public.news_scenarios enable row level security;

drop policy if exists "News scenarios are readable"
  on public.news_scenarios;

create policy "News scenarios are readable"
  on public.news_scenarios
  for select
  to anon, authenticated
  using (true);

grant select on table public.news_scenarios to anon, authenticated;
grant select, insert, update, delete on table public.news_scenarios to service_role;

create table if not exists public.scenario_templates (
  id text primary key,
  pattern text not null,
  module_id text not null,
  lesson_ids jsonb not null default '[]'::jsonb,
  definition jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists scenario_templates_pattern_idx
  on public.scenario_templates (pattern);

alter table public.scenario_templates enable row level security;

drop policy if exists "Scenario templates are readable"
  on public.scenario_templates;

create policy "Scenario templates are readable"
  on public.scenario_templates
  for select
  to anon, authenticated
  using (true);

grant select on table public.scenario_templates to anon, authenticated;
grant select, insert, update, delete on table public.scenario_templates to service_role;
