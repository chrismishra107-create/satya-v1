alter table public.profiles
  add column if not exists is_admin boolean not null default false;

create or replace function public.is_admin_user ()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and is_admin = true
  );
$$;

create table if not exists public.news_cards (
  id uuid primary key default gen_random_uuid(),
  headline text not null,
  summary text not null,
  why_it_matters_student text not null,
  why_it_matters_business text not null,
  category text not null check (category in ('student', 'business', 'both')),
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  published_at timestamptz
);

create index if not exists news_cards_status_created_at_idx
  on public.news_cards (status, created_at desc);

create index if not exists news_cards_category_status_idx
  on public.news_cards (category, status);

create or replace function public.sync_news_card_published_at ()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'published' then
    if new.published_at is null then
      new.published_at = now();
    end if;
  else
    new.published_at = null;
  end if;

  return new;
end;
$$;

drop trigger if exists news_cards_set_published_at on public.news_cards;
create trigger news_cards_set_published_at
  before insert or update on public.news_cards
  for each row
  execute function public.sync_news_card_published_at();

alter table public.news_cards enable row level security;

drop policy if exists "Published news cards are visible to everyone" on public.news_cards;
create policy "Published news cards are visible to everyone"
  on public.news_cards
  for select
  using (status = 'published');

drop policy if exists "Admins can read all news cards" on public.news_cards;
create policy "Admins can read all news cards"
  on public.news_cards
  for select
  using (public.is_admin_user());

drop policy if exists "Admins can insert news cards" on public.news_cards;
create policy "Admins can insert news cards"
  on public.news_cards
  for insert
  with check (public.is_admin_user());

drop policy if exists "Admins can update news cards" on public.news_cards;
create policy "Admins can update news cards"
  on public.news_cards
  for update
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists "Admins can delete news cards" on public.news_cards;
create policy "Admins can delete news cards"
  on public.news_cards
  for delete
  using (public.is_admin_user());
