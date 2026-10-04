-- Uses Supabase Auth anonymous users. Never use the service role key in the app.
create table if not exists public.libraries (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{"saved":[],"recent":[],"paths":[]}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.libraries enable row level security;
create policy "Read own library" on public.libraries for select to authenticated using ((select auth.uid()) = user_id);
create policy "Insert own library" on public.libraries for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own library" on public.libraries for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
