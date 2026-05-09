-- Ejecutar solicitudes de amistad como usuario autenticado y cubrir casos reales (mutual, ya amigos).

grant execute on function public.send_friendship_request(uuid) to authenticated;
grant execute on function public.respond_friendship_request(uuid, text) to authenticated;

create or replace function public.send_friendship_request(p_receiver_id uuid)
returns public.friendships
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_sender uuid := auth.uid();
  v_row public.friendships;
begin
  if v_sender is null then
    raise exception 'Not authenticated';
  end if;
  if p_receiver_id is null then
    raise exception 'receiver_id is required';
  end if;
  if v_sender = p_receiver_id then
    raise exception 'Cannot send friendship request to self';
  end if;

  -- Ya son amigos (cualquier dirección).
  select * into v_row
    from public.friendships
   where status = 'accepted'
     and (
       (sender_id = v_sender and receiver_id = p_receiver_id)
       or (sender_id = p_receiver_id and receiver_id = v_sender)
     )
   limit 1;
  if v_row.id is not null then
    return v_row;
  end if;

  -- El otro usuario ya te envió pendiente: al dar «agregar» queda aceptado (una sola fila).
  select * into v_row
    from public.friendships
   where sender_id = p_receiver_id
     and receiver_id = v_sender
     and status = 'pending'
   limit 1;
  if v_row.id is not null then
    update public.friendships
       set status = 'accepted'
     where id = v_row.id
    returning * into v_row;
    return v_row;
  end if;

  insert into public.friendships (sender_id, receiver_id, status)
  values (v_sender, p_receiver_id, 'pending')
  on conflict (sender_id, receiver_id) do update
    set status = excluded.status,
        created_at = now()
  returning * into v_row;

  return v_row;
end;
$$;
