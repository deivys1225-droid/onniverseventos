import { AnimatePresence, motion } from "framer-motion";
import { MessageCircleMore, UsersRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ComunidadRoomsGrid from "@/components/comunidad/ComunidadRoomsGrid";
import SectionHeader from "@/components/salas/SectionHeader";
import { supabase } from "@/integrations/supabase/client";
import { isStreamPlaybackUrl, resolvePlaybackIdFromActiveStreamRow } from "@/lib/audiencePlayback";
import { muxPlaybackIdFromHlsUrl } from "@/lib/muxPlaybackId";
import { handoffAudienceLiveCardOnAndroid } from "@/lib/liveStreamOpenDirect";
import { handleStreamCardPlay } from "@/lib/streamCardNavigation";
import { buildAgoraChannel } from "@/lib/agoraRooms";
import { Button } from "@/components/ui/button";
import PayPalSmartButton from "@/components/PayPalSmartButton";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useLiveStreamChoiceModal } from "@/hooks/useLiveStreamChoiceModal";
import {
  loadFriendshipPairInfo,
  removeFriendship,
  sendFriendshipRequest,
  type FriendshipPairInfo,
  type FriendshipPairState,
} from "@/lib/friendships";
import { getRoomActiveStream, type ActiveStreamRow, type RoomCard } from "@/lib/salaRoomCards";
import BackToProfileHomeButton from "@/components/BackToProfileHomeButton";
import MiMundoTopActionsPortal from "@/components/MiMundoTopActionsPortal";
import SocialMenu from "@/components/SocialMenu";

const ComunidadPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [communityProfiles, setCommunityProfiles] = useState<
    Array<{ id: string; name: string; avatarUrl: string | null; liveStatus: string }>
  >([]);
  const [activeStreams, setActiveStreams] = useState<ActiveStreamRow[]>([]);
  const [premiumModalRoom, setPremiumModalRoom] = useState<RoomCard | null>(null);
  const [loadingRoomId, setLoadingRoomId] = useState<string | null>(null);
  const [friendshipPairInfo, setFriendshipPairInfo] = useState<Map<string, FriendshipPairInfo>>(new Map());
  const friendshipStates = useMemo(() => {
    const map = new Map<string, FriendshipPairState>();
    friendshipPairInfo.forEach((info, id) => map.set(id, info.state));
    return map;
  }, [friendshipPairInfo]);
  const [socialMenuOpen, setSocialMenuOpen] = useState(false);
  const { requestChoice, dialog: liveStreamChoiceDialog } = useLiveStreamChoiceModal();

  useEffect(() => {
    const loadData = async () => {
      const [{ data: profilesData }, { data: activeData }] = await Promise.all([
        supabase.from("profiles").select("id,full_name,avatar_url,live_status").order("updated_at", { ascending: false }),
        supabase
          .from("active_streams")
          .select("user_id,is_live,title,stream_url,playback_url,playback_id,privacy_mode,ticket_price,updated_at")
          .eq("is_live", true),
      ]);

      const normalized = ((profilesData ?? []) as Array<{
        id: string;
        full_name: string | null;
        avatar_url: string | null;
        live_status?: string | null;
      }>).map((p) => ({
        id: p.id,
        name: p.full_name?.trim() || "Explorador VR",
        avatarUrl: p.avatar_url,
        liveStatus: p.live_status?.trim() || "",
      }));
      setCommunityProfiles(normalized);
      setActiveStreams((activeData ?? []) as ActiveStreamRow[]);
    };

    void loadData();

    const channel = supabase
      .channel("public:comunidad")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        void loadData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "active_streams" }, () => {
        void loadData();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const communityRooms: RoomCard[] = useMemo(
    () =>
      communityProfiles.map((profile) => ({
        id: `community-${profile.id}`,
        name: profile.name,
        image: profile.avatarUrl?.trim() || "/placeholder.svg",
        liveStatus: profile.liveStatus,
        subtitle: "Comunidad OnniVers",
        description: "Nuevo creador registrado en la plataforma.",
        status: "",
        channel: buildAgoraChannel(profile.id),
        isPremium: false,
        priceUsd: 0,
        ownerUserId: profile.id,
      })),
    [communityProfiles],
  );

  const communityProfileIdsKey = useMemo(
    () => communityProfiles.map((p) => p.id).sort().join(","),
    [communityProfiles],
  );

  useEffect(() => {
    if (!user?.id || communityProfiles.length === 0) {
      setFriendshipPairInfo(new Map());
      return;
    }
    const ids = communityProfiles.map((p) => p.id);
    let cancelled = false;
    void loadFriendshipPairInfo(user.id, ids).then((m) => {
      if (!cancelled) setFriendshipPairInfo(m);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id, communityProfileIdsKey, communityProfiles]);

  useEffect(() => {
    if (!user?.id || communityProfiles.length === 0) return;
    const ids = communityProfiles.map((p) => p.id);
    const ch = supabase
      .channel("comunidad-friendships")
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, () => {
        void loadFriendshipPairInfo(user.id, ids).then(setFriendshipPairInfo);
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [user?.id, communityProfileIdsKey, communityProfiles]);

  const beginRoomSession = async (
    room: RoomCard,
    activeStream?: ActiveStreamRow | null,
    options?: { audienceTappedLive?: boolean },
  ) => {
    const audienceTappedLive = Boolean(options?.audienceTappedLive);
    const useLoadingOverlay = !audienceTappedLive;
    if (useLoadingOverlay) setLoadingRoomId(room.id);
    try {
      const streamUrlCandidate = activeStream?.stream_url?.trim() || "";
      const playbackUrlCandidate = activeStream?.playback_url?.trim() || "";
      const resolvedChannel = isStreamPlaybackUrl(streamUrlCandidate) ? room.channel : streamUrlCandidate || room.channel;
      const resolvedToken =
        playbackUrlCandidate && !isStreamPlaybackUrl(playbackUrlCandidate) ? playbackUrlCandidate : "";
      const resolvedTitle = activeStream?.title?.trim() || room.name;

      if (
        handoffAudienceLiveCardOnAndroid(activeStream, resolvedTitle, requestChoice, audienceTappedLive)
      ) {
        return;
      }

      if (activeStream?.is_live) {
        const muxPlaybackId =
          resolvePlaybackIdFromActiveStreamRow(activeStream) ??
          muxPlaybackIdFromHlsUrl(playbackUrlCandidate) ??
          muxPlaybackIdFromHlsUrl(streamUrlCandidate);
        const hlsUrl =
          playbackUrlCandidate && isStreamPlaybackUrl(playbackUrlCandidate)
            ? playbackUrlCandidate
            : streamUrlCandidate && isStreamPlaybackUrl(streamUrlCandidate)
              ? streamUrlCandidate
              : "";
        if (
          handleStreamCardPlay({
            navigate,
            streamUrl: hlsUrl || undefined,
            streamId: muxPlaybackId ?? resolvedChannel,
            playbackId: muxPlaybackId ?? undefined,
            title: resolvedTitle,
          })
        ) {
          return;
        }
        toast.error("No se pudo abrir el stream en vivo.");
        return;
      }

      const params = new URLSearchParams();
      const resolvedStreamUrl = [playbackUrlCandidate, streamUrlCandidate].find((value) => isStreamPlaybackUrl(value)) ?? "";

      if (room.mp4Url) params.set("mp4", room.mp4Url);
      params.set("title", resolvedTitle);
      params.set("mode", room.mp4Url && !activeStream?.is_live ? "vod" : "live");
      if (resolvedToken) params.set("token", resolvedToken);
      if (resolvedStreamUrl) params.set("stream", resolvedStreamUrl);
      const muxPlaybackId = resolvePlaybackIdFromActiveStreamRow(activeStream);
      if (muxPlaybackId) params.set("playbackId", muxPlaybackId);
      const path = `/sala/espectador/${encodeURIComponent(resolvedChannel)}?${params.toString()}`;
      navigate(path);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo abrir la sala.";
      toast.error(msg);
    } finally {
      setLoadingRoomId(null);
    }
  };

  const handleRoomAccess = (room: RoomCard, online: boolean) => {
    const linkedStream = getRoomActiveStream(room, activeStreams);
    if (!online && room.mp4Url) {
      beginRoomSession(room, linkedStream);
      return;
    }
    if (!online) {
      toast.info("Esta sala no está en línea en este momento.");
      return;
    }
    const requiresTicket =
      linkedStream?.privacy_mode === "privado_ticket" &&
      Number.isFinite(linkedStream.ticket_price) &&
      linkedStream.ticket_price > 0;
    if (requiresTicket) {
      setPremiumModalRoom({
        ...room,
        isPremium: true,
        priceUsd: Number(linkedStream?.ticket_price ?? room.priceUsd),
      });
      return;
    }
    beginRoomSession(room, linkedStream, { audienceTappedLive: true });
  };

  const sendFriendRequestToCommunityMember = async (receiverId: string, displayName: string) => {
    if (!user) {
      toast.error("Inicia sesión para enviar solicitudes de amistad.");
      return;
    }
    if (receiverId === user.id) {
      toast.error("No puedes enviarte una solicitud a ti mismo.");
      return;
    }
    const result = await sendFriendshipRequest(receiverId);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    if (result.status === "accepted") {
      toast.success(`Ya son contactos con ${displayName}.`);
    } else {
      toast.success(`Solicitud pendiente enviada a ${displayName}.`);
    }
    const ids = communityProfiles.map((p) => p.id);
    const next = await loadFriendshipPairInfo(user.id, ids);
    setFriendshipPairInfo(next);
  };

  const removeFriendFromCommunity = async (
    friendshipId: string,
    targetUserId: string,
    displayName: string,
  ) => {
    if (!user) return;
    const result = await removeFriendship(friendshipId);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(`Eliminaste a ${displayName} de tus contactos.`);
    const ids = communityProfiles.map((p) => p.id);
    const next = await loadFriendshipPairInfo(user.id, ids);
    setFriendshipPairInfo(next);
  };

  return (
    <div className="relative min-h-screen w-full max-w-full overflow-x-clip overflow-y-auto bg-background" data-camera-page-root>
      <Navbar />

      <div className="pointer-events-none fixed inset-0" data-camera-decorative-bg>
        <motion.div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_5%,hsl(var(--primary)/0.18),transparent_35%),radial-gradient(circle_at_85%_95%,hsl(290_80%_60%/0.16),transparent_40%)]" aria-hidden />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      <main className="relative z-20 px-6 pt-20 pb-20">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-6">
            <BackToProfileHomeButton />
          </div>
          <section id="comunidad" className="scroll-mt-24">
            <SectionHeader
              badge="Comunidad OnniVers"
              icon={UsersRound}
              title="SALAS DE LA"
              highlight="COMUNIDAD"
              subtitle="Usuarios registrados que crean su propio espacio. Conecta, envía solicitudes de amistad y entra a sus salas en vivo."
              accent="border-violet-400/40 bg-violet-500/10 text-violet-200"
            />
            <MiMundoTopActionsPortal
              socialMenuOpen={socialMenuOpen}
              onToggleSocial={() => setSocialMenuOpen((prev) => !prev)}
            />
            {user ? (
              <SocialMenu userId={user.id} open={socialMenuOpen} onClose={() => setSocialMenuOpen(false)} />
            ) : (
              socialMenuOpen && (
                <motion.div className="pointer-events-auto fixed top-32 right-4 z-[70] max-w-[min(92vw,280px)] rounded-xl border border-cyan-300/35 bg-card/90 px-3 py-2 text-xs text-cyan-100 backdrop-blur-xl">
                  <MessageCircleMore className="mr-1 inline h-3.5 w-3.5" />
                  Inicia sesión para usar Messenger.
                </motion.div>
              )
            )}
            <ComunidadRoomsGrid
              communityRooms={communityRooms}
              activeStreams={activeStreams}
              friendshipPairInfo={friendshipPairInfo}
              currentUserId={user?.id}
              onEnterRoom={handleRoomAccess}
              onSendFriendRequest={(receiverId, displayName) => {
                void sendFriendRequestToCommunityMember(receiverId, displayName);
              }}
              onRemoveFriend={(friendshipId, targetUserId, displayName) => {
                void removeFriendFromCommunity(friendshipId, targetUserId, displayName);
              }}
            />
          </section>
        </div>
      </main>

      <Footer />

      {liveStreamChoiceDialog}

      <AnimatePresence>
        {premiumModalRoom && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 12, opacity: 0 }}
              className="w-full max-w-md rounded-2xl border border-amber-300/55 bg-card/95 p-5 shadow-[0_0_60px_-18px_rgba(250,204,21,0.95)]"
            >
              <h3 className="font-display text-xl font-bold text-foreground">Acceso Premium</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Este evento requiere validación de pago para entrar a la sala.
              </p>
              <div className="mt-3 rounded-lg border border-amber-300/45 bg-amber-300/10 p-3">
                <p className="text-sm font-semibold text-foreground">{premiumModalRoom.name}</p>
                <p className="text-xs text-amber-200">Total: ${premiumModalRoom.priceUsd.toFixed(2)} USD</p>
              </div>
              <PayPalSmartButton
                priceUsd={premiumModalRoom.priceUsd}
                description={`Acceso Premium - ${premiumModalRoom.name}`.slice(0, 120)}
                eventId={`sala-premium:${premiumModalRoom.id}`}
                vaultType="ticket"
                vaultTitle={premiumModalRoom.name}
                vaultThumbnailUrl={premiumModalRoom.image}
                notifySource="sala"
                productCategoryId="sala"
                productCategoryLabel="Sala Premium"
                productTitle={premiumModalRoom.name}
                onPurchaseComplete={() => {
                  const selectedRoom = premiumModalRoom;
                  setPremiumModalRoom(null);
                  const linkedStream = getRoomActiveStream(selectedRoom, activeStreams);
                  beginRoomSession(selectedRoom, linkedStream, { audienceTappedLive: true });
                }}
              />
              <div className="mt-3 flex justify-end">
                <Button type="button" variant="outline" onClick={() => setPremiumModalRoom(null)}>
                  Cancelar
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {loadingRoomId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[95] flex items-center justify-center bg-background/92 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ repeat: Infinity, repeatType: "reverse", duration: 0.8 }}
              className="rounded-2xl border border-cyan-300/40 bg-card/40 px-8 py-6 text-center shadow-[0_0_55px_-16px_rgba(34,211,238,0.95)]"
            >
              <p className="font-display text-lg font-bold text-cyan-100">Entrando a la sala...</p>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-cyan-200">al universo loading sequence</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default ComunidadPage;
