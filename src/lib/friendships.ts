import { supabase } from "@/integrations/supabase/client";

export type FriendshipPairState = "none" | "pending_out" | "pending_in" | "friends";

export type SendFriendshipOutcome =
  | { ok: true; status: string; id: string }
  | { ok: false; message: string };

export type RespondFriendshipOutcome =
  | { ok: true; status: string; id: string }
  | { ok: false; message: string };

type FriendshipRecord = {
  id: string;
  status: string;
};

function isMissingRpcError(message: string, functionName: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("could not find the function") ||
    lower.includes("schema cache") ||
    lower.includes(functionName.toLowerCase()) ||
    lower.includes("pgrst202")
  );
}

function toSendOutcome(row: FriendshipRecord | null): SendFriendshipOutcome {
  if (!row?.id || !row.status) {
    return { ok: false, message: "Respuesta inválida del servidor" };
  }
  return { ok: true, status: row.status, id: row.id };
}

function toRespondOutcome(row: FriendshipRecord | null): RespondFriendshipOutcome {
  if (!row?.id || !row.status) {
    return { ok: false, message: "Solicitud no encontrada o no permitida" };
  }
  return { ok: true, status: row.status, id: row.id };
}

async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

async function sendFriendshipRequestDirect(receiverId: string): Promise<SendFriendshipOutcome> {
  const senderId = await getCurrentUserId();
  if (!senderId) {
    return { ok: false, message: "Debes iniciar sesión." };
  }
  if (senderId === receiverId) {
    return { ok: false, message: "No puedes enviarte una solicitud a ti mismo." };
  }

  const { data: accepted, error: acceptedError } = await supabase
    .from("friendships")
    .select("id,status")
    .eq("status", "accepted")
    .or(
      `and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`,
    )
    .limit(1)
    .maybeSingle();
  if (acceptedError) {
    return { ok: false, message: acceptedError.message };
  }
  if (accepted) {
    return toSendOutcome(accepted);
  }

  const { data: incoming, error: incomingError } = await supabase
    .from("friendships")
    .select("id,status")
    .eq("sender_id", receiverId)
    .eq("receiver_id", senderId)
    .eq("status", "pending")
    .maybeSingle();
  if (incomingError) {
    return { ok: false, message: incomingError.message };
  }
  if (incoming) {
    const { data: updated, error: updateError } = await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", incoming.id)
      .select("id,status")
      .single();
    if (updateError) {
      return { ok: false, message: updateError.message };
    }
    return toSendOutcome(updated);
  }

  const { data: inserted, error: insertError } = await supabase
    .from("friendships")
    .upsert(
      { sender_id: senderId, receiver_id: receiverId, status: "pending" },
      { onConflict: "sender_id,receiver_id" },
    )
    .select("id,status")
    .single();
  if (insertError) {
    return { ok: false, message: insertError.message };
  }
  return toSendOutcome(inserted);
}

async function respondFriendshipRequestDirect(
  friendshipId: string,
  status: "accepted" | "declined",
): Promise<RespondFriendshipOutcome> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { ok: false, message: "Debes iniciar sesión." };
  }

  const { data, error } = await supabase
    .from("friendships")
    .update({ status })
    .eq("id", friendshipId)
    .eq("receiver_id", userId)
    .select("id,status")
    .maybeSingle();
  if (error) {
    return { ok: false, message: error.message };
  }
  return toRespondOutcome(data);
}

/** Crea o actualiza fila en `friendships` (RPC en Supabase o tabla con RLS). */
export async function sendFriendshipRequest(receiverId: string): Promise<SendFriendshipOutcome> {
  const { data, error } = await supabase.rpc("send_friendship_request", { p_receiver_id: receiverId });
  if (!error) {
    return toSendOutcome(data as FriendshipRecord | null);
  }
  if (isMissingRpcError(error.message, "send_friendship_request")) {
    return sendFriendshipRequestDirect(receiverId);
  }
  return { ok: false, message: error.message };
}

/** Acepta o rechaza una solicitud pendiente recibida. */
export async function respondFriendshipRequest(
  friendshipId: string,
  status: "accepted" | "declined",
): Promise<RespondFriendshipOutcome> {
  const { data, error } = await supabase.rpc("respond_friendship_request", {
    p_friendship_id: friendshipId,
    p_status: status,
  });
  if (!error) {
    return toRespondOutcome(data as FriendshipRecord | null);
  }
  if (isMissingRpcError(error.message, "respond_friendship_request")) {
    return respondFriendshipRequestDirect(friendshipId, status);
  }
  return { ok: false, message: error.message };
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
