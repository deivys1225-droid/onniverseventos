-- Live streaming fields on profiles
alter table public.profiles
  add column if not exists stream_key text,
  add column if not exists is_live boolean not null default false;

-- Optional helper index for live profile lookups
create index if not exists profiles_is_live_idx on public.profiles (is_live);
