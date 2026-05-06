create table if not exists public.active_streams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  stream_url text not null,
  title text not null,
  category text not null,
  is_live boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.active_streams enable row level security;

drop policy if exists "active_streams_select_public" on public.active_streams;
drop policy if exists "active_streams_insert_own" on public.active_streams;
drop policy if exists "active_streams_update_own" on public.active_streams;

create policy "active_streams_select_public"
  on public.active_streams for select
  using (true);

create policy "active_streams_insert_own"
  on public.active_streams for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "active_streams_update_own"
  on public.active_streams for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table public.profiles
  add column if not exists live_status text not null default 'Offline';

create or replace function public.stop_my_active_streams()
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  update public.active_streams
     set is_live = false,
         updated_at = now()
   where user_id = v_uid;

  update public.profiles
     set live_status = 'Offline',
         updated_at = now()
   where id = v_uid;
end;
$$;
