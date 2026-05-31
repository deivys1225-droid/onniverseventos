-- Phase 4: publicar tablas de clases virtuales en Supabase Realtime.
-- Esto permite que estudiantes y docente reciban cambios al instante.

do $$
begin
  begin
    alter publication supabase_realtime add table public.aulas_virtuales;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.aula_miembros;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.clase_templates;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.clase_sesiones;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.clase_eventos;
  exception
    when duplicate_object then null;
  end;
end
$$;
