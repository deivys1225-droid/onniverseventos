import { motion } from "framer-motion";
import { Box, Clock, Mic2, UserPlus, UserRoundCheck, UserX } from "lucide-react";
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
import type { FriendshipPairInfo } from "@/lib/friendships";
import {
  salaRoomCardPadding,
  salaRoomCtaIcon,
  salaRoomCtaRow,
  salaRoomDesc,
  salaRoomFriendBtn,
  salaRoomFriendIcon,
  salaRoomGridClass,
  salaRoomImageHeight,
  salaRoomImageWrapMb,
  salaRoomOverlayBar,
  salaRoomOverlayIcon,
  salaRoomStatusBadge,
  salaRoomTitle,
  salaRoomEmptyState,
} from "@/components/salas/salaRoomCardStyles";
import { getRoomActiveStream, isCommunityMemberOnline, type ActiveStreamRow, type RoomCard } from "@/lib/salaRoomCards";

type ComunidadRoomsGridProps = {
  communityRooms: RoomCard[];
  activeStreams: ActiveStreamRow[];
  friendshipPairInfo: Map<string, FriendshipPairInfo>;
  currentUserId?: string;
  onEnterRoom: (room: RoomCard, online: boolean) => void;
  onSendFriendRequest: (receiverId: string, displayName: string) => void;
  onRemoveFriend: (friendshipId: string, targetUserId: string, displayName: string) => void;
};

export default function ComunidadRoomsGrid({
  communityRooms,
  activeStreams,
  friendshipPairInfo,
  currentUserId,
  onEnterRoom,
  onSendFriendRequest,
  onRemoveFriend,
}: ComunidadRoomsGridProps) {
  return (
    <motion.div className={salaRoomGridClass}>
      {communityRooms.length === 0 && (
        <div
          className={`col-span-full rounded-2xl border border-border/50 bg-card/35 text-center text-muted-foreground backdrop-blur-xl ${salaRoomEmptyState}`}
        >
          Aun no hay salas comunitarias registradas.
        </div>
      )}
      {communityRooms.map((room, index) => {
        const linkedStream = getRoomActiveStream(room, activeStreams);
        const online = room.ownerUserId ? isCommunityMemberOnline(room.ownerUserId, activeStreams) : false;
        const pair = room.ownerUserId
          ? friendshipPairInfo.get(room.ownerUserId) ?? { state: "none" as const, friendshipId: null }
          : { state: "none" as const, friendshipId: null };

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
              pair.state === "friends" && pair.friendshipId ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className={`${salaRoomFriendBtn} border border-rose-400/45 bg-black/35 text-rose-200 shadow-[0_0_14px_-4px_rgba(244,63,94,0.65)] hover:bg-black/50`}
                      onClick={(e) => e.stopPropagation()}
                      title="Eliminar contacto"
                      aria-label={`Eliminar contacto ${room.name}`}
                    >
                      <UserX className={salaRoomFriendIcon} />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="border-cyan-300/30 bg-card" onClick={(e) => e.stopPropagation()}>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar contacto?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Dejarás de ver a {room.name} en tu lista de contactos. Los mensajes de esta conversación también
                        se eliminarán.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-rose-600 hover:bg-rose-700"
                        onClick={() => onRemoveFriend(pair.friendshipId!, room.ownerUserId!, room.name)}
                      >
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : pair.state === "pending_out" ? (
                <div
                  className={`${salaRoomFriendBtn} flex items-center justify-center border border-cyan-300/30 bg-black/35 text-cyan-200/60`}
                  title="Solicitud pendiente"
                  aria-label="Solicitud pendiente"
                >
                  <Clock className={salaRoomFriendIcon} />
                </div>
              ) : (
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className={`${salaRoomFriendBtn} border border-cyan-300/40 bg-black/35 text-cyan-200 shadow-[0_0_14px_-4px_rgba(34,211,238,0.85)] hover:bg-black/50`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSendFriendRequest(room.ownerUserId!, room.name);
                  }}
                  title={
                    pair.state === "pending_in"
                      ? "Aceptar solicitud de amistad"
                      : "Agregar contacto"
                  }
                  aria-label={
                    pair.state === "pending_in"
                      ? `Aceptar solicitud de ${room.name}`
                      : `Agregar contacto ${room.name}`
                  }
                >
                  {pair.state === "pending_in" ? (
                    <UserRoundCheck className={salaRoomFriendIcon} />
                  ) : (
                    <UserPlus className={salaRoomFriendIcon} />
                  )}
                </Button>
              )
            )}
            <button
              type="button"
              onClick={() => onEnterRoom(room, online)}
              className={`group relative block w-full rounded-2xl border bg-card/40 text-left backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 ${salaRoomCardPadding} ${
                online
                  ? "border-amber-300/80 shadow-[0_0_55px_-10px_rgba(250,204,21,0.95)] hover:border-yellow-200/90"
                  : "border-border/50 hover:border-primary/50 hover:shadow-[0_0_45px_-10px_hsl(var(--primary)/0.5)]"
              }`}
            >
              <div className={`relative overflow-hidden rounded-xl border border-primary/20 ${salaRoomImageWrapMb}`}>
                <img
                  src={room.image}
                  alt={room.name}
                  className={`${salaRoomImageHeight} w-full object-cover transition-transform duration-500 group-hover:scale-105`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
                <div
                  className={`absolute bottom-2 left-2 right-2 flex items-center justify-between rounded-lg border border-white/10 bg-black/45 text-cyan-200 backdrop-blur-md ${salaRoomOverlayBar}`}
                >
                  <span className="flex items-center gap-1">
                    <Box className={`${salaRoomOverlayIcon} text-primary`} />
                    Sala
                  </span>
                  <span className="text-slate-300">{room.subtitle}</span>
                </div>
              </div>
              <div className="mb-2 flex items-center justify-between gap-2 sm:gap-3">
                <h3 className={`${salaRoomTitle} truncate`}>{room.name}</h3>
                <span
                  className={`${salaRoomStatusBadge} shrink-0 ${
                    online ? "bg-amber-300 text-black" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {online ? "EN LÍNEA" : "OFFLINE"}
                </span>
              </div>
              <p className={`mb-3 sm:mb-4 ${salaRoomDesc}`}>{room.description}</p>
              <span
                className={`${salaRoomCtaRow} transition group-hover:bg-primary/20 group-hover:shadow-[0_0_24px_-4px_hsl(var(--primary)/0.6)]`}
              >
                <Mic2 className={salaRoomCtaIcon} />
                {linkedStream?.privacy_mode === "privado_ticket" ? "Ver acceso premium" : "Entrar gratis"}
              </span>
            </button>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
