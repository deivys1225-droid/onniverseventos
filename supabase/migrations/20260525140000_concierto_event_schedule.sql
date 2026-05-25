-- Fecha/hora del evento Conciertos Live (ventana de emisión).

alter table public.profiles
  add column if not exists concierto_event_at timestamptz,
  add column if not exists concierto_event_timezone text default 'America/Lima';

comment on column public.profiles.concierto_event_at is
  'Inicio programado del evento live; habilita Emitir live en la ventana del día del show.';
