alter table public.active_streams
  add column if not exists livepeer_stream_id text;

create index if not exists active_streams_livepeer_stream_id_idx
  on public.active_streams (livepeer_stream_id)
  where livepeer_stream_id is not null;
