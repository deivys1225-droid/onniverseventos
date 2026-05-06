create table if not exists public.live_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  requester_email text not null,
  artist_name text not null,
  ticket_price numeric(10,2) not null check (ticket_price > 0),
  stadium_display_name text not null,
  event_image_url text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.live_requests enable row level security;

drop policy if exists "live_requests_insert_own" on public.live_requests;
drop policy if exists "live_requests_select_own" on public.live_requests;

create policy "live_requests_insert_own"
  on public.live_requests for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "live_requests_select_own"
  on public.live_requests for select
  to authenticated
  using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('live-event-images', 'live-event-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "live_event_images_public_read" on storage.objects;
drop policy if exists "live_event_images_insert_own" on storage.objects;
drop policy if exists "live_event_images_update_own" on storage.objects;

create policy "live_event_images_public_read"
  on storage.objects for select
  using (bucket_id = 'live-event-images');

create policy "live_event_images_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'live-event-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "live_event_images_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'live-event-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
