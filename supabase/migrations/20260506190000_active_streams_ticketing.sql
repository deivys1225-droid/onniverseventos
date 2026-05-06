alter table public.active_streams
  add column if not exists privacy_mode text not null default 'publico'
    check (privacy_mode in ('publico', 'privado_ticket')),
  add column if not exists ticket_price numeric(10,2);
