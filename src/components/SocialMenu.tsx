import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Clock, MessageCircle, Search, UserPlus, UserX, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  loadFriendshipPairInfo,
  removeFriendship,
  respondFriendshipRequest,
  sendFriendshipRequest,
  type FriendshipPairInfo,
} from "@/lib/friendships";

type FriendshipRow = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  live_status?: string | null;
  is_live?: boolean | null;
};

type ConnectedFriend = {
  friendshipId: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  isOnline: boolean;
};

type PendingRequest = {
  friendshipId: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl: string | null;
};

type ChatMessage = {
  id: string;
  friendship_id: string;
  sender_id: string;
  message: string;
  created_at: string;
};

type SearchResult = {
  id: string;
  name: string;
  avatarUrl: string | null;
  isOnline: boolean;
};

type SocialMenuProps = {
  userId: string;
  open: boolean;
  onClose: () => void;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function profileOnline(profile: Pick<ProfileRow, "is_live" | "live_status">): boolean {
  return Boolean(profile.is_live) || profile.live_status?.trim() === "En Vivo";
}

function profileName(profile: Pick<ProfileRow, "full_name">): string {
  return profile.full_name?.trim() || "Usuario";
}

function isMissingIsLiveColumnError(error: { message?: string | null; details?: string | null } | null): boolean {
  if (!error) return false;
  const details = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
  return (
    (details.includes("column") && details.includes("does not exist")) ||
    (details.includes("could not find") && details.includes("schema cache")) ||
    details.includes("'is_live'") ||
    details.includes("is_live")
  );
}

async function selectProfilesByIds(ids: string[]): Promise<ProfileRow[]> {
  if (ids.length === 0) return [];
  const withIsLive = await supabase
    .from("profiles")
    .select("id,full_name,avatar_url,live_status,is_live")
    .in("id", ids);
  if (!withIsLive.error) {
    return (withIsLive.data ?? []) as ProfileRow[];
  }
  if (!isMissingIsLiveColumnError(withIsLive.error)) {
    throw withIsLive.error;
  }
  const legacy = await supabase
    .from("profiles")
    .select("id,full_name,avatar_url,live_status")
    .in("id", ids);
  if (legacy.error) throw legacy.error;
  return ((legacy.data ?? []) as Array<Omit<ProfileRow, "is_live">>).map((p) => ({
    ...p,
    is_live: null,
  }));
}

async function selectProfilesByQuery(userId: string, q: string): Promise<ProfileRow[]> {
  let withIsLive = supabase
    .from("profiles")
    .select("id,full_name,avatar_url,live_status,is_live")
    .neq("id", userId)
    .limit(12);

  if (UUID_RE.test(q)) {
    withIsLive = withIsLive.eq("id", q);
  } else {
    withIsLive = withIsLive.ilike("full_name", `%${q}%`);
  }

  const firstTry = await withIsLive;
  if (!firstTry.error) {
    return (firstTry.data ?? []) as ProfileRow[];
  }
  if (!isMissingIsLiveColumnError(firstTry.error)) {
    throw firstTry.error;
  }

  let legacy = supabase
    .from("profiles")
    .select("id,full_name,avatar_url,live_status")
    .neq("id", userId)
    .limit(12);
  if (UUID_RE.test(q)) {
    legacy = legacy.eq("id", q);
  } else {
    legacy = legacy.ilike("full_name", `%${q}%`);
  }
  const legacyRes = await legacy;
  if (legacyRes.error) throw legacyRes.error;
  return ((legacyRes.data ?? []) as Array<Omit<ProfileRow, "is_live">>).map((p) => ({
    ...p,
    is_live: null,
  }));
}

const SocialMenu = ({ userId, open, onClose }: SocialMenuProps) => {
  const [friendships, setFriendships] = useState<FriendshipRow[]>([]);
  const [profilesById, setProfilesById] = useState<
    Record<string, { name: string; avatarUrl: string | null; isOnline: boolean }>
  >({});
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchPairInfo, setSearchPairInfo] = useState<Map<string, FriendshipPairInfo>>(new Map());
  const [searchBusyId, setSearchBusyId] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"contacts" | "requests">("contacts");
  const [removeBusyId, setRemoveBusyId] = useState<string | null>(null);
  const [selectedFriend, setSelectedFriend] = useState<ConnectedFriend | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState("");

  const reloadFriendships = useCallback(async () => {
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

    if (ids.size === 0) {
      setProfilesById({});
      return;
    }

    let profiles: ProfileRow[] = [];
    try {
      profiles = await selectProfilesByIds(Array.from(ids));
    } catch {
      profiles = [];
    }
    const map: Record<string, { name: string; avatarUrl: string | null; isOnline: boolean }> = {};
    profiles.forEach((p) => {
      map[p.id] = {
        name: profileName(p),
        avatarUrl: p.avatar_url ?? null,
        isOnline: profileOnline(p),
      };
    });
    setProfilesById(map);
  }, [userId]);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSearchResults([]);
      setSelectedFriend(null);
      setActiveTab("contacts");
      return;
    }

    void reloadFriendships();

    const friendshipChannel = supabase
      .channel(`social-friendships-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, () => {
        void reloadFriendships();
      })
      .subscribe();

    const profileChannel = supabase
      .channel(`social-profiles-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        void reloadFriendships();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(friendshipChannel);
      void supabase.removeChannel(profileChannel);
    };
  }, [open, userId, reloadFriendships]);

  useEffect(() => {
    if (!open) return;
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setSearchPairInfo(new Map());
      setSearchLoading(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      setSearchLoading(true);
      try {
        let rows: ProfileRow[] = [];
        try {
          rows = await selectProfilesByQuery(userId, q);
        } catch (error) {
          const message = error instanceof Error ? error.message : "No se pudo cargar perfiles.";
          toast.error(message);
          setSearchResults([]);
          return;
        }
        const normalized = rows.map((p) => ({
          id: p.id,
          name: profileName(p),
          avatarUrl: p.avatar_url ?? null,
          isOnline: profileOnline(p),
        }));
        setSearchResults(normalized);
        const info = await loadFriendshipPairInfo(
          userId,
          normalized.map((row) => row.id),
        );
        setSearchPairInfo(info);
      } finally {
        setSearchLoading(false);
      }
    }, 280);

    return () => window.clearTimeout(timer);
  }, [open, searchQuery, userId]);

  useEffect(() => {
    if (!selectedFriend) {
      setMessages([]);
      return;
    }

    const friendshipId = selectedFriend.friendshipId;
    const load = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("friendship_id", friendshipId)
        .order("created_at", { ascending: true });
      setMessages((data ?? []) as ChatMessage[]);
    };
    void load();

    const channel = supabase
      .channel(`social-chat-${friendshipId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `friendship_id=eq.${friendshipId}` },
        (payload) => setMessages((prev) => [...prev, payload.new as ChatMessage]),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [selectedFriend]);

  const connected = useMemo<ConnectedFriend[]>(
    () =>
      friendships
        .filter((f) => f.status === "accepted")
        .map((f) => {
          const friendId = f.sender_id === userId ? f.receiver_id : f.sender_id;
          const profile = profilesById[friendId];
          return {
            friendshipId: f.id,
            userId: friendId,
            name: profile?.name || "Amigo",
            avatarUrl: profile?.avatarUrl ?? null,
            isOnline: profile?.isOnline ?? false,
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
          senderAvatarUrl: profilesById[f.sender_id]?.avatarUrl ?? null,
        })),
    [friendships, profilesById, userId],
  );

  const respond = async (friendshipId: string, status: "accepted" | "declined") => {
    setBusyRequestId(friendshipId);
    const result = await respondFriendshipRequest(friendshipId, status);
    if (!result.ok) {
      toast.error(result.message);
      setBusyRequestId(null);
      return;
    }
    setFriendships((prev) => prev.map((f) => (f.id === friendshipId ? { ...f, status } : f)));
    void reloadFriendships();
    if (searchQuery.trim().length >= 2) {
      const info = await loadFriendshipPairInfo(userId, searchResults.map((r) => r.id));
      setSearchPairInfo(info);
    }
    setBusyRequestId(null);
    toast.success(status === "accepted" ? "Contacto agregado." : "Solicitud rechazada.");
  };

  const sendRequest = async (targetId: string) => {
    setSearchBusyId(targetId);
    const result = await sendFriendshipRequest(targetId);
    if (!result.ok) {
      toast.error(result.message);
      setSearchBusyId(null);
      return;
    }
    await reloadFriendships();
    const info = await loadFriendshipPairInfo(userId, [targetId]);
    setSearchPairInfo((prev) => {
      const next = new Map(prev);
      next.set(targetId, info.get(targetId) ?? { state: "pending_out", friendshipId: result.id });
      return next;
    });
    setSearchBusyId(null);
    if (result.status === "accepted") {
      toast.success("Ya son contactos.");
    } else {
      toast.success("Solicitud pendiente enviada.");
    }
  };

  const removeContact = async (friendshipId: string, targetUserId: string, displayName: string) => {
    setRemoveBusyId(friendshipId);
    const result = await removeFriendship(friendshipId);
    if (!result.ok) {
      toast.error(result.message);
      setRemoveBusyId(null);
      return;
    }
    if (selectedFriend?.friendshipId === friendshipId) {
      setSelectedFriend(null);
    }
    await reloadFriendships();
    const info = await loadFriendshipPairInfo(userId, [targetUserId]);
    setSearchPairInfo((prev) => {
      const next = new Map(prev);
      next.set(targetUserId, info.get(targetUserId) ?? { state: "none", friendshipId: null });
      return next;
    });
    setRemoveBusyId(null);
    toast.success(`Eliminaste a ${displayName} de tus contactos.`);
  };

  const onSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedFriend) return;
    const message = messageText.trim();
    if (!message) return;
    setMessageText("");
    const { error } = await supabase.from("chat_messages").insert({
      friendship_id: selectedFriend.friendshipId,
      sender_id: userId,
      message,
    });
    if (error) {
      toast.error(error.message);
    }
  };

  const renderSearchAction = (targetId: string, displayName: string) => {
    const pair = searchPairInfo.get(targetId) ?? { state: "none" as const, friendshipId: null };
    if (pair.state === "friends" && pair.friendshipId) {
      return (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 border-rose-400/40 px-2.5 text-[11px] text-rose-200 hover:bg-rose-500/10"
              disabled={removeBusyId === pair.friendshipId}
            >
              <UserX className="mr-1 h-3.5 w-3.5" />
              Eliminar contacto
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="border-cyan-300/30 bg-card">
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar contacto?</AlertDialogTitle>
              <AlertDialogDescription>
                Dejarás de ver a {displayName} en tu lista de contactos. Los mensajes de esta conversación también se
                eliminarán.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-rose-600 hover:bg-rose-700"
                onClick={() => void removeContact(pair.friendshipId!, targetId, displayName)}
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );
    }
    if (pair.state === "pending_out") {
      return (
        <Button type="button" size="sm" variant="secondary" className="h-8 px-2.5 text-[11px]" disabled>
          <Clock className="mr-1 h-3.5 w-3.5" />
          Solicitud pendiente
        </Button>
      );
    }
    if (pair.state === "pending_in" && pair.friendshipId) {
      return (
        <Button
          type="button"
          size="sm"
          variant="heroOutline"
          className="h-8 px-2.5 text-[11px]"
          disabled={busyRequestId === pair.friendshipId}
          onClick={() => void respond(pair.friendshipId, "accepted")}
        >
          <Check className="mr-1 h-3.5 w-3.5" />
          Aceptar solicitud
        </Button>
      );
    }
    return (
      <Button
        type="button"
        size="sm"
        variant="heroOutline"
        className="h-8 px-2.5 text-[11px]"
        disabled={searchBusyId === targetId}
        onClick={() => void sendRequest(targetId)}
      >
        <UserPlus className="mr-1 h-3.5 w-3.5" />
        Agregar
      </Button>
    );
  };

  if (!open) return null;

  const showSearchResults = searchQuery.trim().length >= 2;

  return (
    <div className="pointer-events-auto fixed top-32 right-4 z-[70] flex h-[min(calc(100dvh-9rem),560px)] w-[min(calc(100vw-2rem),780px)] flex-col overflow-hidden rounded-2xl border border-cyan-300/30 bg-card/70 shadow-[0_0_55px_-18px_rgba(34,211,238,0.85)] backdrop-blur-2xl">
      <div className="border-b border-white/10 px-3 py-3 sm:px-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="font-display text-sm font-bold uppercase tracking-[0.16em] text-white">Messenger</p>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={onClose} aria-label="Cerrar Messenger">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-200/80" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre o ID de usuario"
            className="h-10 border-white/15 bg-black/25 pl-9 text-sm text-white placeholder:text-white/45"
          />
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "contacts" | "requests")}
        className="flex min-h-0 flex-1 flex-col"
      >
        <TabsList className="mx-3 mt-2 grid h-10 w-auto grid-cols-2 rounded-xl border border-white/10 bg-black/25 p-1 sm:mx-4">
          <TabsTrigger value="contacts" className="text-xs font-semibold uppercase tracking-wide">
            Contactos
          </TabsTrigger>
          <TabsTrigger value="requests" className="text-xs font-semibold uppercase tracking-wide">
            Solicitudes de amistad
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contacts" className="mt-0 min-h-0 flex-1 data-[state=active]:flex">
          <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[minmax(220px,34%)_1fr]">
            <div className={`min-h-0 border-white/10 md:border-r ${selectedFriend ? "hidden md:flex" : "flex"} flex-col`}>
              {!showSearchResults && (
                <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-200/80">
                  Tus contactos
                </p>
              )}
              <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2 sm:px-3">
                {showSearchResults ? (
                  <div className="space-y-1.5">
                    {searchLoading && <p className="px-2 py-2 text-xs text-white/60">Buscando usuarios…</p>}
                    {!searchLoading && searchResults.length === 0 && (
                      <p className="px-2 py-2 text-xs text-white/60">No se encontraron usuarios.</p>
                    )}
                    {searchResults.map((result) => (
                      <div
                        key={result.id}
                        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2"
                      >
                        <div className="relative shrink-0">
                          <img
                            src={result.avatarUrl?.trim() || "/placeholder.svg"}
                            alt={`Avatar de ${result.name}`}
                            className="h-10 w-10 rounded-full object-cover ring-1 ring-white/20"
                          />
                          <span
                            className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-black/60 ${
                              result.isOnline ? "bg-emerald-400" : "bg-slate-500"
                            }`}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-white">{result.name}</p>
                          <p className="truncate text-[10px] text-white/50">{result.id}</p>
                        </div>
                        {renderSearchAction(result.id, result.name)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {connected.length === 0 && (
                      <p className="px-2 py-2 text-xs text-white/60">
                        Aún no tienes contactos. Busca usuarios arriba o acepta solicitudes.
                      </p>
                    )}
                    {connected.map((friend) => (
                      <button
                        key={friend.friendshipId}
                        type="button"
                        onClick={() => setSelectedFriend(friend)}
                        className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left transition ${
                          selectedFriend?.friendshipId === friend.friendshipId
                            ? "border border-cyan-300/45 bg-cyan-500/15"
                            : "border border-transparent bg-white/5 hover:border-white/15"
                        }`}
                      >
                        <div className="relative shrink-0">
                          <img
                            src={friend.avatarUrl?.trim() || "/placeholder.svg"}
                            alt={`Avatar de ${friend.name}`}
                            className="h-10 w-10 rounded-full object-cover ring-1 ring-white/20"
                          />
                          <span
                            className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-black/60 ${
                              friend.isOnline ? "bg-emerald-400" : "bg-slate-500"
                            }`}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-white">{friend.name}</p>
                          <p className="text-[11px] text-white/55">{friend.isOnline ? "En línea" : "Desconectado"}</p>
                        </div>
                        <MessageCircle className="h-4 w-4 shrink-0 text-cyan-200/90" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className={`min-h-0 flex-col ${selectedFriend ? "flex" : "hidden md:flex"}`}>
              {selectedFriend ? (
                <>
                  <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 md:hidden"
                      onClick={() => setSelectedFriend(null)}
                      aria-label="Volver a contactos"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <img
                      src={selectedFriend.avatarUrl?.trim() || "/placeholder.svg"}
                      alt={`Avatar de ${selectedFriend.name}`}
                      className="h-9 w-9 rounded-full object-cover ring-1 ring-white/20"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{selectedFriend.name}</p>
                      <p className="text-[11px] text-white/55">{selectedFriend.isOnline ? "En línea" : "Desconectado"}</p>
                    </div>
                  </div>
                  <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
                    {messages.map((m) => {
                      const own = m.sender_id === userId;
                      return (
                        <div key={m.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-snug ${
                              own
                                ? "border border-white/15 bg-white/15 text-white/95"
                                : "bg-sky-500/80 text-white shadow-[0_0_18px_-10px_rgba(56,189,248,0.9)]"
                            }`}
                          >
                            {m.message}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <form className="flex gap-2 border-t border-white/10 p-3" onSubmit={onSendMessage}>
                    <Input
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Escribe un mensaje..."
                      className="h-10 border-white/15 bg-black/25 text-sm text-white placeholder:text-white/45"
                    />
                    <Button type="submit" size="icon" className="h-10 w-10 shrink-0">
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </form>
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-white/55">
                  Selecciona un contacto para abrir la conversación.
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="requests" className="mt-0 min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4">
          <div className="space-y-2">
            {pending.length === 0 && (
              <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-xs text-white/60">
                No tienes solicitudes pendientes.
              </p>
            )}
            {pending.map((req) => (
              <div
                key={req.friendshipId}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2"
              >
                <img
                  src={req.senderAvatarUrl?.trim() || "/placeholder.svg"}
                  alt={`Avatar de ${req.senderName}`}
                  className="h-10 w-10 rounded-full object-cover ring-1 ring-white/20"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{req.senderName}</p>
                  <p className="text-[11px] text-white/55">Quiere conectar contigo</p>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  disabled={busyRequestId === req.friendshipId}
                  onClick={() => void respond(req.friendshipId, "accepted")}
                  aria-label="Aceptar solicitud"
                >
                  <Check className="h-4 w-4 text-emerald-300" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  disabled={busyRequestId === req.friendshipId}
                  onClick={() => void respond(req.friendshipId, "declined")}
                  aria-label="Rechazar solicitud"
                >
                  <X className="h-4 w-4 text-rose-300" />
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SocialMenu;
