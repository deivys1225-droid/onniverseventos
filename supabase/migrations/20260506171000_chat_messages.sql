create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  friendship_id uuid not null references public.friendships(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  message text not null check (char_length(trim(message)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_friendship_created_idx
  on public.chat_messages (friendship_id, created_at);

alter table public.chat_messages enable row level security;

drop policy if exists "chat_messages_select_participants_only" on public.chat_messages;
drop policy if exists "chat_messages_insert_participants_only" on public.chat_messages;

create policy "chat_messages_select_participants_only"
  on public.chat_messages for select
  to authenticated
  using (
    exists (
      select 1
      from public.friendships f
      where f.id = friendship_id
        and (f.sender_id = auth.uid() or f.receiver_id = auth.uid())
    )
  );

create policy "chat_messages_insert_participants_only"
  on public.chat_messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1
      from public.friendships f
      where f.id = friendship_id
        and f.status = 'accepted'
        and (f.sender_id = auth.uid() or f.receiver_id = auth.uid())
    )
  );

alter publication supabase_realtime add table public.chat_messages;
