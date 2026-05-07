-- Viewer playback id for Livepeer HLS (profiles.profile card / marketplace sync)
alter table public.profiles
  add column if not exists playback_id text;

create index if not exists profiles_playback_id_idx on public.profiles (playback_id)
  where playback_id is not null;

-- Al detener live desde la app, limpiar estado de emisión en perfil
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
         is_live = false,
         stream_key = null,
         playback_id = null,
         updated_at = now()
   where id = v_uid;
end;
$$;
