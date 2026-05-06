create table if not exists public.store_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null check (item_type in ('biblioteca', 'cursos')),
  title text not null,
  cover_image_url text not null,
  sale_price numeric(10,2) not null check (sale_price > 0),
  file_url text,
  video_url text,
  created_at timestamptz not null default now()
);

alter table public.store_items enable row level security;

drop policy if exists "store_items_select_public" on public.store_items;
drop policy if exists "store_items_insert_own" on public.store_items;

create policy "store_items_select_public"
  on public.store_items for select
  using (true);

create policy "store_items_insert_own"
  on public.store_items for insert
  to authenticated
  with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('store-assets', 'store-assets', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "store_assets_public_read" on storage.objects;
drop policy if exists "store_assets_insert_own_folder" on storage.objects;

create policy "store_assets_public_read"
  on storage.objects for select
  using (bucket_id = 'store-assets');

create policy "store_assets_insert_own_folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'store-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
