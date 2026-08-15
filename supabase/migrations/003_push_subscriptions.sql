create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription jsonb not null,
  created_at timestamptz not null default now()
);

create unique index if not exists push_subscriptions_user_id_key on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "Users can insert their own push subscription"
  on public.push_subscriptions
  for insert
  with check (auth.uid() = user_id);

create policy "Users can read their own push subscription"
  on public.push_subscriptions
  for select
  using (auth.uid() = user_id);

create policy "Users can update their own push subscription"
  on public.push_subscriptions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own push subscription"
  on public.push_subscriptions
  for delete
  using (auth.uid() = user_id);
