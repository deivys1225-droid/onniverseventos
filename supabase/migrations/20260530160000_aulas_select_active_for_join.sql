-- Permite descubrir aulas activas por slug para flujo de ingreso/solicitud.
-- No reemplaza políticas de edición; solo lectura adicional.

drop policy if exists "aulas_select_active_for_join" on public.aulas_virtuales;

create policy "aulas_select_active_for_join"
  on public.aulas_virtuales
  for select
  to authenticated
  using (is_active = true);
