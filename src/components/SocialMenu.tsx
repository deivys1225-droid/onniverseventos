import { useEffect, useMemo, useState } from "react";
import { Check, MessageCircle, UserPlus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type FriendshipRow = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
};

type ProfileRow = { id: string; full_name: string | null; live_status?: string | null };

type ConnectedFriend = { friendshipId: string; userId: string; name: string };
type PendingRequest = { friendshipId: string; senderId: string; senderName: string };

type SocialMenuProps = {
  userId: string;
  open: boolean;
  onClose: () => void;
  onOpenChat: (friend: ConnectedFriend) => void;
};

const SocialMenu = ({ userId, open, onClose, onOpenChat }: SocialMenuProps) => {
  const [friendships, setFriendships] = useState<FriendshipRow[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, { name: string; liveStatus: string }>>({});
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      const { data } = await supabase
        .from("friendships")
        .select("*")
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: false });
      const rows = (data ?? []) as FriendshipRow[];
      setFriendships(rows);
      const ids = new Set<string>();
      rows.forEach((row) => {
        ids.add(row.sender_id);
        ids.add(row.receiver_id);
      });
      if (ids.size === 0) return;
      const { data: profiles } = await supabase.from("profiles").select("id,full_name,live_status").in("id", Array.from(ids));
      const map: Record<string, { name: string; liveStatus: string }> = {};
      (profiles as ProfileRow[] | null)?.forEach((p) => {
        map[p.id] = { name: p.full_name?.trim() || "Usuario", liveStatus: p.live_status?.trim() || "Offline" };
      });
      setProfilesById(map);
    };
    void load();
  }, [open, userId]);

  const connected = useMemo<ConnectedFriend[]>(
    () =>
      friendships
        .filter((f) => f.status === "accepted")
        .map((f) => {
          const friendId = f.sender_id === userId ? f.receiver_id : f.sender_id;
          return {
            friendshipId: f.id,
            userId: friendId,
            name: profilesById[friendId]?.name || "Amigo",
          };
        }),
    [friendships, profilesById, userId],
  );

  const pending = useMemo<PendingRequest[]>(
    () =>
      friendships
        .filter((f) => f.status === "pending" && f.receiver_id === userId)
        .map((f) => ({
          friendshipId: f.id,
          senderId: f.sender_id,
          senderName: profilesById[f.sender_id]?.name || "Usuario",
        })),
    [friendships, profilesById, userId],
  );

  const respond = async (friendshipId: string, status: "accepted" | "declined") => {
    setBusyRequestId(friendshipId);
    await supabase.rpc("respond_friendship_request", { p_friendship_id: friendshipId, p_status: status });
    setFriendships((prev) => prev.map((f) => (f.id === friendshipId ? { ...f, status } : f)));
    setBusyRequestId(null);
  };

  if (!open) return null;

  return (
    <div className="pointer-events-auto fixed bottom-20 right-4 z-[70] w-[min(92vw,340px)] rounded-2xl border border-cyan-300/35 bg-card/85 p-3 shadow-[0_0_45px_-16px_rgba(34,211,238,0.85)] backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-display text-xs font-bold uppercase tracking-[0.16em] text-cyan-200">Social</p>
        <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={onClose} aria-label="Cerrar social">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="mb-3 rounded-xl border border-white/10 bg-black/20 p-2.5">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-cyan-200">Amigos conectados</p>
        <div className="space-y-1.5">
          {connected.length === 0 && <p className="text-xs text-muted-foreground">Aun no tienes amigos aceptados.</p>}
          {connected.map((friend) => (
            <div key={friend.friendshipId} className="flex items-center justify-between rounded-lg bg-white/5 px-2 py-1.5">
              <span className="truncate pr-2 text-sm text-foreground">
                {friend.name}
                {profilesById[friend.userId]?.liveStatus === "En Vivo" ? (
                  <span className="ml-1 text-[10px] font-semibold text-emerald-300">EN VIVO</span>
                ) : null}
              </span>
              <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => onOpenChat(friend)}>
                <MessageCircle className="h-4 w-4 text-cyan-200" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/20 p-2.5">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-amber-200">Solicitudes pendientes</p>
        <div className="space-y-1.5">
          {pending.length === 0 && <p className="text-xs text-muted-foreground">No tienes solicitudes pendientes.</p>}
          {pending.map((req) => (
            <div key={req.friendshipId} className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1.5">
              <UserPlus className="h-3.5 w-3.5 text-amber-200" />
              <span className="flex-1 truncate text-sm">{req.senderName}</span>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                disabled={busyRequestId === req.friendshipId}
                onClick={() => void respond(req.friendshipId, "accepted")}
              >
                <Check className="h-3.5 w-3.5 text-emerald-300" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                disabled={busyRequestId === req.friendshipId}
                onClick={() => void respond(req.friendshipId, "declined")}
              >
                <X className="h-3.5 w-3.5 text-rose-300" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SocialMenu;
