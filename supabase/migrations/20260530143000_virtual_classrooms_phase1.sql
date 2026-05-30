-- Phase 1: aulas virtuales cerradas (docente/estudiante) con RLS.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_user_role') then
    create type public.app_user_role as enum ('particular', 'estudiante', 'docente', 'admin');
  end if;
end
$$;

alter table public.profiles
  add column if not exists app_role public.app_user_role not null default 'particular',
  add column if not exists teacher_request_pending boolean not null default false;

create index if not exists profiles_app_role_idx on public.profiles(app_role);

create or replace function public.is_teacher_or_admin(uid uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists(
    select 1
    from public.profiles p
    where p.id = uid
      and p.app_role in ('docente', 'admin')
  );
$$;

create table if not exists public.aulas_virtuales (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  nombre text not null,
  descripcion text,
  docente_id uuid not null references auth.users(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists aulas_virtuales_docente_idx on public.aulas_virtuales(docente_id);
create index if not exists aulas_virtuales_slug_idx on public.aulas_virtuales(slug);

create table if not exists public.aula_miembros (
  id uuid primary key default gen_random_uuid(),
  aula_id uuid not null references public.aulas_virtuales(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rol text not null check (rol in ('teacher', 'student', 'assistant')),
  estado text not null check (estado in ('approved', 'pending', 'blocked')) default 'pending',
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (aula_id, user_id)
);

create index if not exists aula_miembros_aula_estado_idx on public.aula_miembros(aula_id, estado);
create index if not exists aula_miembros_user_idx on public.aula_miembros(user_id);

create table if not exists public.clase_templates (
  id uuid primary key default gen_random_uuid(),
  aula_id uuid not null unique references public.aulas_virtuales(id) on delete cascade,
  titulo text not null default 'Clase Virtual',
  mp4_url text,
  pdf_url text,
  glb_url text,
  metadata jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clase_sesiones (
  id uuid primary key default gen_random_uuid(),
  aula_id uuid not null references public.aulas_virtuales(id) on delete cascade,
  host_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('scheduled', 'live', 'ended')) default 'live',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  state_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clase_sesiones_aula_status_idx on public.clase_sesiones(aula_id, status, started_at desc);

create table if not exists public.clase_eventos (
  id bigserial primary key,
  session_id uuid not null references public.clase_sesiones(id) on delete cascade,
  aula_id uuid not null references public.aulas_virtuales(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  seq bigint not null,
  created_at timestamptz not null default now(),
  unique (session_id, seq)
);

create index if not exists clase_eventos_session_seq_idx on public.clase_eventos(session_id, seq);
create index if not exists clase_eventos_aula_created_idx on public.clase_eventos(aula_id, created_at desc);

alter table public.aulas_virtuales enable row level security;
alter table public.aula_miembros enable row level security;
alter table public.clase_templates enable row level security;
alter table public.clase_sesiones enable row level security;
alter table public.clase_eventos enable row level security;

drop policy if exists "aulas_select_members" on public.aulas_virtuales;
drop policy if exists "aulas_insert_teacher" on public.aulas_virtuales;
drop policy if exists "aulas_update_owner" on public.aulas_virtuales;
drop policy if exists "aulas_delete_owner" on public.aulas_virtuales;

create policy "aulas_select_members"
  on public.aulas_virtuales
  for select
  using (
    docente_id = auth.uid()
    or exists (
      select 1
      from public.aula_miembros m
      where m.aula_id = id
        and m.user_id = auth.uid()
        and m.estado = 'approved'
    )
  );

create policy "aulas_insert_teacher"
  on public.aulas_virtuales
  for insert
  to authenticated
  with check (
    docente_id = auth.uid()
    and public.is_teacher_or_admin(auth.uid())
  );

create policy "aulas_update_owner"
  on public.aulas_virtuales
  for update
  to authenticated
  using (docente_id = auth.uid())
  with check (docente_id = auth.uid());

create policy "aulas_delete_owner"
  on public.aulas_virtuales
  for delete
  to authenticated
  using (docente_id = auth.uid());

drop policy if exists "aula_miembros_select_members" on public.aula_miembros;
drop policy if exists "aula_miembros_insert_teacher_or_self_pending" on public.aula_miembros;
drop policy if exists "aula_miembros_update_teacher" on public.aula_miembros;
drop policy if exists "aula_miembros_delete_teacher" on public.aula_miembros;

create policy "aula_miembros_select_members"
  on public.aula_miembros
  for select
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.aulas_virtuales a
      where a.id = aula_id
        and a.docente_id = auth.uid()
    )
  );

create policy "aula_miembros_insert_teacher_or_self_pending"
  on public.aula_miembros
  for insert
  to authenticated
  with check (
    (
      exists (
        select 1
        from public.aulas_virtuales a
        where a.id = aula_id
          and a.docente_id = auth.uid()
      )
    )
    or (
      user_id = auth.uid()
      and rol = 'student'
      and estado = 'pending'
    )
  );

create policy "aula_miembros_update_teacher"
  on public.aula_miembros
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.aulas_virtuales a
      where a.id = aula_id
        and a.docente_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.aulas_virtuales a
      where a.id = aula_id
        and a.docente_id = auth.uid()
    )
  );

create policy "aula_miembros_delete_teacher"
  on public.aula_miembros
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.aulas_virtuales a
      where a.id = aula_id
        and a.docente_id = auth.uid()
    )
  );

drop policy if exists "templates_select_members" on public.clase_templates;
drop policy if exists "templates_insert_update_teacher" on public.clase_templates;
drop policy if exists "templates_delete_teacher" on public.clase_templates;

create policy "templates_select_members"
  on public.clase_templates
  for select
  using (
    exists (
      select 1
      from public.aulas_virtuales a
      where a.id = aula_id
        and (
          a.docente_id = auth.uid()
          or exists (
            select 1
            from public.aula_miembros m
            where m.aula_id = a.id
              and m.user_id = auth.uid()
              and m.estado = 'approved'
          )
        )
    )
  );

create policy "templates_insert_update_teacher"
  on public.clase_templates
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.aulas_virtuales a
      where a.id = aula_id
        and a.docente_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.aulas_virtuales a
      where a.id = aula_id
        and a.docente_id = auth.uid()
    )
  );

create policy "templates_delete_teacher"
  on public.clase_templates
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.aulas_virtuales a
      where a.id = aula_id
        and a.docente_id = auth.uid()
    )
  );

drop policy if exists "sesiones_select_members" on public.clase_sesiones;
drop policy if exists "sesiones_insert_update_teacher" on public.clase_sesiones;

create policy "sesiones_select_members"
  on public.clase_sesiones
  for select
  using (
    exists (
      select 1
      from public.aulas_virtuales a
      where a.id = aula_id
        and (
          a.docente_id = auth.uid()
          or exists (
            select 1
            from public.aula_miembros m
            where m.aula_id = a.id
              and m.user_id = auth.uid()
              and m.estado = 'approved'
          )
        )
    )
  );

create policy "sesiones_insert_update_teacher"
  on public.clase_sesiones
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.aulas_virtuales a
      where a.id = aula_id
        and a.docente_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.aulas_virtuales a
      where a.id = aula_id
        and a.docente_id = auth.uid()
    )
  );

drop policy if exists "eventos_select_members" on public.clase_eventos;
drop policy if exists "eventos_insert_teacher_only" on public.clase_eventos;

create policy "eventos_select_members"
  on public.clase_eventos
  for select
  using (
    exists (
      select 1
      from public.aulas_virtuales a
      where a.id = aula_id
        and (
          a.docente_id = auth.uid()
          or exists (
            select 1
            from public.aula_miembros m
            where m.aula_id = a.id
              and m.user_id = auth.uid()
              and m.estado = 'approved'
          )
        )
    )
  );

create policy "eventos_insert_teacher_only"
  on public.clase_eventos
  for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1
      from public.aulas_virtuales a
      where a.id = aula_id
        and a.docente_id = auth.uid()
    )
  );

alter table public.clase_templates replica identity full;
alter table public.clase_sesiones replica identity full;
alter table public.clase_eventos replica identity full;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'update_aulas_virtuales_updated_at') then
    create trigger update_aulas_virtuales_updated_at
      before update on public.aulas_virtuales
      for each row execute function public.update_updated_at_column();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'update_aula_miembros_updated_at') then
    create trigger update_aula_miembros_updated_at
      before update on public.aula_miembros
      for each row execute function public.update_updated_at_column();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'update_clase_templates_updated_at') then
    create trigger update_clase_templates_updated_at
      before update on public.clase_templates
      for each row execute function public.update_updated_at_column();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'update_clase_sesiones_updated_at') then
    create trigger update_clase_sesiones_updated_at
      before update on public.clase_sesiones
      for each row execute function public.update_updated_at_column();
  end if;
end
$$;
