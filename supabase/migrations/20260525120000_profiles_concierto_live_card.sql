-- Tarjeta pública de Conciertos Live por usuario (configurable desde la app).

alter table public.profiles
  add column if not exists concierto_card_title text,
  add column if not exists concierto_card_subtitle text default 'Live Premium',
  add column if not exists concierto_card_description text,
  add column if not exists concierto_card_image_url text,
  add column if not exists concierto_card_published boolean not null default false,
  add column if not exists concierto_live_access boolean not null default false;

comment on column public.profiles.concierto_card_published is
  'Si true y el usuario tiene concierto_live_access, la tarjeta aparece en /nuestras-salas.';

comment on column public.profiles.concierto_live_access is
  'Acceso premium para crear/publicar tarjeta en Conciertos Live (p. ej. tras pago confirmado).';
