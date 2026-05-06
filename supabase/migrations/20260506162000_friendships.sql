create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  check (sender_id <> receiver_id)
);

create unique index if not exists friendships_sender_receiver_unique_idx
  on public.friendships (sender_id, receiver_id);

alter table public.friendships enable row level security;

drop policy if exists "friendships_select_own_only" on public.friendships;
drop policy if exists "friendships_insert_sender_only" on public.friendships;
drop policy if exists "friendships_update_participants_only" on public.friendships;
drop policy if exists "friendships_delete_sender_only" on public.friendships;

create policy "friendships_select_own_only"
  on public.friendships for select
  to authenticated
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "friendships_insert_sender_only"
  on public.friendships for insert
  to authenticated
  with check (
    auth.uid() = sender_id
    and sender_id <> receiver_id
    and status = 'pending'
  );

create policy "friendships_update_participants_only"
  on public.friendships for update
  to authenticated
  using (auth.uid() = sender_id or auth.uid() = receiver_id)
  with check (
    auth.uid() = sender_id or auth.uid() = receiver_id
  );

create policy "friendships_delete_sender_only"
  on public.friendships for delete
  to authenticated
  using (auth.uid() = sender_id);

-- Optional helper RPCs for safe request flow from client
create or replace function public.send_friendship_request(p_receiver_id uuid)
returns public.friendships
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_sender uuid := auth.uid();
  v_row public.friendships;
begin
  if v_sender is null then
    raise exception 'Not authenticated';
  end if;
  if p_receiver_id is null then
    raise exception 'receiver_id is required';
  end if;
  if v_sender = p_receiver_id then
    raise exception 'Cannot send friendship request to self';
  end if;

  insert into public.friendships (sender_id, receiver_id, status)
  values (v_sender, p_receiver_id, 'pending')
  on conflict (sender_id, receiver_id) do update
    set status = excluded.status,
        created_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.respond_friendship_request(
  p_friendship_id uuid,
  p_status text
)
returns public.friendships
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_row public.friendships;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;
  if p_status not in ('accepted', 'declined') then
    raise exception 'Invalid response status';
  end if;

  update public.friendships
     set status = p_status
   where id = p_friendship_id
     and receiver_id = v_user
  returning * into v_row;

  if v_row is null then
    raise exception 'Friendship request not found or not allowed';
  end if;

  return v_row;
end;
$$;
