import { motion } from "framer-motion";
import { Box, Check, Clock, Mic2, UserPlus, UserRoundCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FriendshipPairState } from "@/lib/friendships";
import { getRoomActiveStream, isCommunityMemberOnline, type ActiveStreamRow, type RoomCard } from "@/lib/salaRoomCards";

type ComunidadRoomsGridProps = {
  communityRooms: RoomCard[];
  activeStreams: ActiveStreamRow[];
  friendshipStates: Map<string, FriendshipPairState>;
  currentUserId?: string;
  onEnterRoom: (room: RoomCard, online: boolean) => void;
  onSendFriendRequest: (receiverId: string, displayName: string) => void;
};

export default function ComunidadRoomsGrid({
  communityRooms,
  activeStreams,
  friendshipStates,
  currentUserId,
  onEnterRoom,
  onSendFriendRequest,
}: ComunidadRoomsGridProps) {
  return (
    <motion.div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {communityRooms.length === 0 && (
        <div className="col-span-full rounded-2xl border border-border/50 bg-card/35 p-6 text-center text-sm text-muted-foreground backdrop-blur-xl">
          Aun no hay salas comunitarias registradas.
        </div>
      )}
      {communityRooms.map((room, index) => {
        const linkedStream = getRoomActiveStream(room, activeStreams);
        const online = room.ownerUserId ? isCommunityMemberOnline(room.ownerUserId, activeStreams) : false;
        const pairState: FriendshipPairState = room.ownerUserId
          ? friendshipStates.get(room.ownerUserId) ?? "none"
          : "none";

        return (
          <motion.div
            key={room.id}
            className="relative"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ delay: index * 0.05 }}
          >
            {currentUserId && room.ownerUserId && room.ownerUserId !== currentUserId && (
              pairState === "friends" ? (
                <div
                  className="absolute right-3 top-3 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-emerald-400/50 bg-black/40 text-emerald-400 shadow-[0_0_14px_-4px_rgba(52,211,153,0.75)]"
                  title="Ya son contactos"
                  aria-hidden
                >
                  <Check className="h-3.5 w-3.5" />
                </div>
              ) : pairState === "pending_out" ? (
                <div
                  className="absolute right-3 top-3 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-cyan-300/30 bg-black/35 text-cyan-200/60"
                  title="Solicitud enviada · pendiente"
                  aria-hidden
                >
                  <Clock className="h-3.5 w-3.5" />
                </div>
              ) : (
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="absolute right-3 top-3 z-20 h-7 w-7 rounded-full border border-cyan-300/40 bg-black/35 text-cyan-200 shadow-[0_0_14px_-4px_rgba(34,211,238,0.85)] hover:bg-black/50"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSendFriendRequest(room.ownerUserId!, room.name);
                  }}
                  title={
                    pairState === "pending_in"
                      ? "Te enviaron solicitud · pulsa para aceptar (se guarda en Supabase)"
                      : "Enviar solicitud de amistad"
                  }
                  aria-label={
                    pairState === "pending_in"
                      ? `Aceptar solicitud de ${room.name}`
                      : `Enviar solicitud de amistad a ${room.name}`
                  }
                >
                  {pairState === "pending_in" ? (
                    <UserRoundCheck className="h-3.5 w-3.5" />
                  ) : (
                    <UserPlus className="h-3.5 w-3.5" />
                  )}
                </Button>
              )
            )}
            <button
              type="button"
              onClick={() => onEnterRoom(room, online)}
              className={`group relative block w-full rounded-2xl border bg-card/40 p-5 text-left backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 ${
                online
                  ? "border-amber-300/80 shadow-[0_0_55px_-10px_rgba(250,204,21,0.95)] hover:border-yellow-200/90"
                  : "border-border/50 hover:border-primary/50 hover:shadow-[0_0_45px_-10px_hsl(var(--primary)/0.5)]"
              }`}
            >
              <div className="relative mb-4 overflow-hidden rounded-xl border border-primary/20">
                <img
                  src={room.image}
                  alt={room.name}
                  className="h-44 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between rounded-lg border border-white/10 bg-black/45 px-2 py-1 text-[10px] font-display uppercase tracking-wider text-cyan-200 backdrop-blur-md">
                  <span className="flex items-center gap-1">
                    <Box className="h-3 w-3 text-primary" />
                    Sala
                  </span>
                  <span className="text-slate-300">{room.subtitle}</span>
                </div>
              </div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="font-display text-lg font-semibold text-foreground">{room.name}</h3>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-display font-bold uppercase tracking-wide ${
                    online ? "bg-amber-300 text-black" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {online ? "EN LÍNEA" : "OFFLINE"}
                </span>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">{room.description}</p>
              <span className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 py-2.5 text-xs font-display font-bold uppercase tracking-wide text-primary transition group-hover:bg-primary/20 group-hover:shadow-[0_0_24px_-4px_hsl(var(--primary)/0.6)]">
                <Mic2 className="h-4 w-4" />
                {linkedStream?.privacy_mode === "privado_ticket" ? "Ver acceso premium" : "Entrar gratis"}
              </span>
            </button>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
