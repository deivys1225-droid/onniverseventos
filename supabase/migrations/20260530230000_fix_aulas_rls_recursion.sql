-- Fix RLS recursion between aulas_virtuales <-> aula_miembros policies.
-- Cause:
--   aulas_virtuales SELECT policy checks aula_miembros
--   aula_miembros policies checked aulas_virtuales again
-- Result:
--   infinite recursion detected in policy for relation "aulas_virtuales"

create or replace function public.is_aula_docente(aula_uuid uuid, uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.aulas_virtuales a
    where a.id = aula_uuid
      and a.docente_id = uid
  );
$$;

grant execute on function public.is_aula_docente(uuid, uuid) to authenticated;

drop policy if exists "aula_miembros_select_members" on public.aula_miembros;
drop policy if exists "aula_miembros_insert_teacher_or_self_pending" on public.aula_miembros;
drop policy if exists "aula_miembros_update_teacher" on public.aula_miembros;
drop policy if exists "aula_miembros_delete_teacher" on public.aula_miembros;

create policy "aula_miembros_select_members"
  on public.aula_miembros
  for select
  using (
    user_id = auth.uid()
    or public.is_aula_docente(aula_id, auth.uid())
  );

create policy "aula_miembros_insert_teacher_or_self_pending"
  on public.aula_miembros
  for insert
  to authenticated
  with check (
    public.is_aula_docente(aula_id, auth.uid())
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
  using (public.is_aula_docente(aula_id, auth.uid()))
  with check (public.is_aula_docente(aula_id, auth.uid()));

create policy "aula_miembros_delete_teacher"
  on public.aula_miembros
  for delete
  to authenticated
  using (public.is_aula_docente(aula_id, auth.uid()));
