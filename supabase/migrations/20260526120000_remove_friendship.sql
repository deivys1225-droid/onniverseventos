-- Eliminar contacto: ambos participantes pueden borrar la fila (y mensajes en cascada).

drop policy if exists "friendships_delete_sender_only" on public.friendships;

drop policy if exists "friendships_delete_participants" on public.friendships;
create policy "friendships_delete_participants"
  on public.friendships for delete
  to authenticated
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create or replace function public.remove_friendship(p_friendship_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.friendships
   where id = p_friendship_id
     and (sender_id = v_user or receiver_id = v_user);

  if not found then
    raise exception 'Friendship not found or not allowed';
  end if;
end;
$$;

grant execute on function public.remove_friendship(uuid) to authenticated;
