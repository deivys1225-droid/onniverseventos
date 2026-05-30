-- Seguridad de roles en profiles:
-- - Registro público: solo particular/estudiante.
-- - Docente/Admin: solo por cambio manual (service_role / SQL admin).

drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (
    auth.uid() = id
    and app_role in ('particular', 'estudiante')
  );

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.guard_profiles_role_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- El cliente autenticado normal no puede forzar rol docente/admin.
  -- service_role (admin/manual) sí puede hacerlo.
  if auth.role() <> 'service_role' then
    if tg_op = 'insert' then
      if new.app_role not in ('particular', 'estudiante') then
        raise exception 'Solo se permite registrar roles particular o estudiante.';
      end if;
    elsif tg_op = 'update' then
      if new.app_role is distinct from old.app_role then
        raise exception 'El rol solo puede cambiarlo un administrador.';
      end if;
    end if;
  end if;

  return new;
end;
$$;

do $$
begin
  if exists (select 1 from pg_trigger where tgname = 'guard_profiles_role_changes_trg') then
    drop trigger guard_profiles_role_changes_trg on public.profiles;
  end if;
end
$$;

create trigger guard_profiles_role_changes_trg
  before insert or update on public.profiles
  for each row
  execute function public.guard_profiles_role_changes();
