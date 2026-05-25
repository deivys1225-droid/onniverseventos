-- Sin tarjeta automática: revierte backfills y deja acceso premium en false por defecto.

alter table public.profiles
  add column if not exists concierto_live_access boolean not null default false;

alter table public.profiles
  alter column concierto_card_published set default false;

update public.profiles
set
  concierto_live_access = false,
  concierto_card_published = false
where concierto_live_access is distinct from true;

-- Quita tarjetas creadas sin acceso premium (p. ej. registro automático anterior).
update public.profiles
set
  concierto_card_title = null,
  concierto_card_subtitle = null,
  concierto_card_description = null,
  concierto_card_image_url = null
where concierto_live_access = false;
