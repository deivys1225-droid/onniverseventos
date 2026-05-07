alter table public.active_streams
  add column if not exists playback_url text,
  add column if not exists playback_id text;
