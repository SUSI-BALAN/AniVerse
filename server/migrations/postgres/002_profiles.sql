-- Additive Stage 10.1 profile storage. Authentication metadata stays in Supabase Auth.
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (
    char_length(display_name) between 1 and 40
    and char_length(btrim(display_name)) > 0
    and display_name !~ '[[:cntrl:]]'
  ),
  avatar_id varchar(9) not null check (avatar_id in (
    'avatar-01','avatar-02','avatar-03','avatar-04','avatar-05','avatar-06'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- The primary key provides the index for all owner-scoped profile lookups.
alter table public.profiles enable row level security;
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_delete_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);
create policy profiles_insert_own on public.profiles for insert to authenticated
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);
create policy profiles_update_own on public.profiles for update to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);
create policy profiles_delete_own on public.profiles for delete to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);
