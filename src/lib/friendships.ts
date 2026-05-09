import { supabase } from "@/integrations/supabase/client";

export type FriendshipPairState = "none" | "pending_out" | "pending_in" | "friends";

export type SendFriendshipOutcome =
  | { ok: true; status: string; id: string }
  | { ok: false; message: string };

/** Crea o actualiza fila en `friendships` vía RPC (Supabase). */
export async function sendFriendshipRequest(receiverId: string): Promise<SendFriendshipOutcome> {
  const { data, error } = await supabase.rpc("send_friendship_request", { p_receiver_id: receiverId });
  if (error) {
    return { ok: false, message: error.message };
  }
  const row = data as { id?: string; status?: string } | null;
  if (!row?.id || !row.status) {
    return { ok: false, message: "Respuesta inválida del servidor" };
  }
  return { ok: true, status: row.status, id: row.id };
}

/** Estado visual por usuario objetivo (tarjetas comunidad / buscador). */
export async function loadFriendshipPairStates(
  myUserId: string,
  targetUserIds: string[],
): Promise<Map<string, FriendshipPairState>> {
  const map = new Map<string, FriendshipPairState>();
  const unique = [...new Set(targetUserIds)].filter((id) => id && id !== myUserId);
  unique.forEach((id) => map.set(id, "none"));
  if (unique.length === 0) return map;

  const [outRes, inRes] = await Promise.all([
    supabase
      .from("friendships")
      .select("receiver_id,status")
      .eq("sender_id", myUserId)
      .in("receiver_id", unique),
    supabase
      .from("friendships")
      .select("sender_id,status")
      .eq("receiver_id", myUserId)
      .in("sender_id", unique),
  ]);

  const outgoing = (outRes.data ?? []) as { receiver_id: string; status: string }[];
  const incoming = (inRes.data ?? []) as { sender_id: string; status: string }[];

  for (const id of unique) {
    const out = outgoing.find((r) => r.receiver_id === id);
    const inc = incoming.find((r) => r.sender_id === id);

    if (out?.status === "accepted" || inc?.status === "accepted") {
      map.set(id, "friends");
      continue;
    }
    if (out?.status === "pending") {
      map.set(id, "pending_out");
      continue;
    }
    if (inc?.status === "pending") {
      map.set(id, "pending_in");
      continue;
    }
    map.set(id, "none");
  }

  return map;
}
