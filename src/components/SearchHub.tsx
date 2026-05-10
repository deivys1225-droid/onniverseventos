import { useEffect, useMemo, useState } from "react";
import { Search, UserPlus, X, Check, Clock, UserRoundCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { onniverseDeepLink, SALA_MP4_URL_BY_ID } from "@/data/salaVideoUrls";
import {
  loadFriendshipPairStates,
  sendFriendshipRequest,
  type FriendshipPairState,
} from "@/lib/friendships";

type SearchHubProps = {
  currentUserId?: string;
};

type ProfileResult = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  is_live?: boolean | null;
};

type SalaContentItem = {
  id: string;
  title: string;
  tags: string[];
  mp4Url: string;
};

const SALA_CONTENT_INDEX: SalaContentItem[] = [
  { id: "beele", title: "Beele Live", tags: ["#Musica"], mp4Url: SALA_MP4_URL_BY_ID.beele },
  { id: "j-balvin", title: "J Balvin Show", tags: ["#Musica"], mp4Url: SALA_MP4_URL_BY_ID["j-balvin"] },
  { id: "shakira", title: "Shakira Performance", tags: ["#Musica"], mp4Url: SALA_MP4_URL_BY_ID.shakira },
  { id: "franco-escamilla", title: "Franco Escamilla", tags: ["#Educacion"], mp4Url: SALA_MP4_URL_BY_ID["franco-escamilla"] },
  { id: "luisito-comunica-er", title: "Luisito Comunica ER", tags: ["#Educacion"], mp4Url: SALA_MP4_URL_BY_ID["luisito-comunica-er"] },
  { id: "vr-360", title: "Vuelo 360", tags: ["#Educacion", "#Aventura"], mp4Url: SALA_MP4_URL_BY_ID["vr-360"] },
];

const SearchHub = ({ currentUserId }: SearchHubProps) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"usuarios" | "contenido">("usuarios");
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<ProfileResult[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [friendshipStates, setFriendshipStates] = useState<Map<string, FriendshipPairState>>(new Map());

  const filteredContent = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SALA_CONTENT_INDEX;
    return SALA_CONTENT_INDEX.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.tags.some((tag) => tag.toLowerCase().includes(q.startsWith("#") ? q : `#${q}`)),
    );
  }, [query]);

  const searchUsers = async (value: string) => {
    setQuery(value);
    if (mode !== "usuarios") return;
    setLoadingUsers(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id,full_name,avatar_url,is_live")
      .order("updated_at", { ascending: false });
    setLoadingUsers(false);
    if (error) return;
    const rows = (data ?? []) as ProfileResult[];
    setUsers(rows);
  };

  const sendRequest = async (receiverId: string, name: string) => {
    if (!currentUserId) {
      toast.error("Inicia sesion para enviar solicitudes.");
      return;
    }
    const result = await sendFriendshipRequest(receiverId);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    if (result.status === "accepted") {
      toast.success(`Ya son contactos con ${name}.`);
    } else {
      toast.success(`Solicitud enviada a ${name}.`);
    }
    const ids = users.map((u) => u.id).filter((id) => id !== currentUserId);
    const next = await loadFriendshipPairStates(currentUserId, ids);
    setFriendshipStates(next);
  };

  const userIdsKey = useMemo(() => users.map((u) => u.id).sort().join(","), [users]);

  useEffect(() => {
    if (!currentUserId || users.length === 0) {
      setFriendshipStates(new Map());
      return;
    }
    const ids = users.map((u) => u.id);
    void loadFriendshipPairStates(currentUserId, ids).then(setFriendshipStates);
  }, [currentUserId, userIdsKey, users]);

  useEffect(() => {
    if (!open || mode !== "usuarios") return;
    void searchUsers(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="pointer-events-auto fixed left-4 top-20 z-[70] inline-flex h-11 w-11 items-center justify-center rounded-full border border-cyan-300/40 bg-card/80 text-cyan-100 shadow-[0_0_24px_-8px_rgba(34,211,238,0.75)] backdrop-blur-xl transition hover:bg-card"
        aria-label="Abrir buscador"
      >
        <Search className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="pointer-events-auto fixed left-4 top-20 z-[70] w-[min(92vw,560px)] rounded-2xl border border-cyan-300/30 bg-card/80 p-3 backdrop-blur-xl shadow-[0_0_45px_-18px_rgba(34,211,238,0.75)]">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-cyan-200">Buscador</p>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={() => setOpen(false)}
          aria-label="Cerrar buscador"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="mb-3 flex items-center gap-2">
        <Button type="button" variant={mode === "usuarios" ? "default" : "outline"} size="sm" onClick={() => setMode("usuarios")}>
          Usuarios
        </Button>
        <Button type="button" variant={mode === "contenido" ? "default" : "outline"} size="sm" onClick={() => setMode("contenido")}>
          Contenido
        </Button>
      </div>

      <div className="relative mb-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-200/80" />
        <Input
          value={query}
          onChange={(e) => void searchUsers(e.target.value)}
          placeholder={mode === "usuarios" ? "Buscar usuarios..." : "Buscar etiquetas (#Musica, #Educacion)"}
          className="pl-9 border-cyan-300/30 bg-black/25"
        />
      </div>
      {mode === "usuarios" && <div className="mb-2 text-[11px] text-cyan-100/80">Mostrando todos los perfiles.</div>}

      {mode === "usuarios" ? (
        <div className="grid max-h-44 grid-cols-1 gap-2 overflow-y-auto md:grid-cols-2">
          {loadingUsers && <p className="text-xs text-muted-foreground">Buscando usuarios...</p>}
          {!loadingUsers && users.length === 0 && <p className="text-xs text-muted-foreground">No se encontraron perfiles.</p>}
          {users.map((u) => {
            const st = currentUserId && u.id !== currentUserId ? friendshipStates.get(u.id) ?? "none" : "none";
            return (
              <div
                key={u.id}
                className={`flex items-center gap-2 rounded-xl border p-2 ${
                  u.is_live
                    ? "border-amber-300/80 bg-amber-300/10 shadow-[0_0_24px_-8px_rgba(250,204,21,0.95)]"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <img
                  src={u.avatar_url?.trim() || "/placeholder.svg"}
                  alt={`Foto de perfil de ${u.full_name?.trim() || "usuario"}`}
                  className="h-9 w-9 rounded-full object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{u.full_name?.trim() || "Usuario"}</p>
                  <p className={`text-[11px] ${u.is_live ? "text-amber-300" : "text-cyan-200"}`}>
                    {u.is_live ? "En Vivo" : "Entrar"}
                  </p>
                </div>
                {currentUserId && u.id !== currentUserId ? (
                  st === "friends" ? (
                    <div className="flex h-8 w-8 items-center justify-center rounded-md border border-emerald-400/40 text-emerald-400" title="Ya son contactos">
                      <Check className="h-4 w-4" />
                    </div>
                  ) : st === "pending_out" ? (
                    <div className="flex h-8 w-8 items-center justify-center text-cyan-200/50" title="Solicitud enviada">
                      <Clock className="h-4 w-4" />
                    </div>
                  ) : (
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      title={st === "pending_in" ? "Aceptar solicitud" : "Enviar solicitud"}
                      onClick={() => void sendRequest(u.id, u.full_name?.trim() || "Usuario")}
                    >
                      {st === "pending_in" ? <UserRoundCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                    </Button>
                  )
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid max-h-44 grid-cols-1 gap-2 overflow-y-auto md:grid-cols-2">
          {filteredContent.length === 0 && <p className="text-xs text-muted-foreground">No hay videos para esa etiqueta.</p>}
          {filteredContent.map((item) => (
            <a
              key={item.id}
              href={onniverseDeepLink(item.mp4Url)}
              className="rounded-xl border border-white/10 bg-white/5 p-2 transition hover:border-cyan-300/45"
            >
              <p className="truncate text-sm font-semibold">{item.title}</p>
              <p className="mt-1 text-[11px] text-cyan-200">{item.tags.join(" · ")}</p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchHub;
