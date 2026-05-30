-- Marca administradores iniciales por correo.
-- Nota: se ejecuta con privilegios de migración (service role).

insert into public.profiles (id, full_name, app_role, teacher_request_pending, updated_at)
select
  u.id,
  coalesce(
    nullif(u.raw_user_meta_data ->> 'full_name', ''),
    split_part(u.email, '@', 1),
    'Usuario'
  ) as full_name,
  'admin'::public.app_user_role,
  false,
  now()
from auth.users u
where u.email in ('deivys1224@gmail.com', 'empresatecnologicadecolombia@gmail.com')
on conflict (id) do update
set
  app_role = 'admin'::public.app_user_role,
  teacher_request_pending = false,
  updated_at = now();
