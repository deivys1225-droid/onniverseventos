import { AnimatePresence, motion } from "framer-motion";
import { Mic2, Radio, Box } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { podcastStreamers } from "@/data/podcastStreamers";
import { supabase } from "@/integrations/supabase/client";
import {
  audienceStreamSessionKey,
  isStreamPlaybackUrl,
  resolvePlaybackIdFromActiveStreamRow,
} from "@/lib/audiencePlayback";
import { muxPlaybackIdFromHlsUrl } from "@/lib/muxPlaybackId";
import { handoffSalaCardOnAndroid } from "@/lib/salaOpenDirect";
import { fetchPublishedConciertoCards } from "@/lib/conciertoLiveCard";
import { getRoomActiveStream, type ActiveStreamRow, type RoomCard } from "@/lib/salaRoomCards";
import { shuffleArray } from "@/lib/shuffleArray";
import { handleStreamCardPlay } from "@/lib/streamCardNavigation";
import { buildAgoraChannel } from "@/lib/agoraRooms";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SALA_MP4_URL_BY_ID } from "@/data/salaVideoUrls";
import { useSalaChoiceModal } from "@/hooks/useSalaChoiceModal";
import {
  salaRoomCardPadding,
  salaRoomCtaIcon,
  salaRoomDesc,
  salaRoomGridClass,
  salaRoomImageHeight,
  salaRoomImageWrapMb,
  salaRoomOverlayBar,
  salaRoomOverlayIcon,
  salaRoomPrimaryBtn,
  salaRoomStatusBadge,
  salaRoomTitle,
} from "@/components/salas/salaRoomCardStyles";
import BackToProfileHomeButton from "@/components/BackToProfileHomeButton";

const SectionHeader = ({
  badge,
  icon: Icon,
  title,
  highlight,
  subtitle,
  accent,
}: {
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  highlight: string;
  subtitle: string;
  accent: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-80px" }}
    className="mb-10 text-center"
  >
    <span
      className={`mb-5 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-display font-semibold uppercase tracking-[0.2em] ${accent}`}
    >
      <Icon className="h-4 w-4" />
      {badge}
    </span>
    <h2 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
      {title} <span className="text-gradient-neon">{highlight}</span>
    </h2>
    <p className="mx-auto mt-4 max-w-3xl text-base text-muted-foreground md:text-lg">{subtitle}</p>
  </motion.div>
);

const NuestrasSalasPage = () => {
  const navigate = useNavigate();
  const [userConciertoRooms, setUserConciertoRooms] = useState<RoomCard[]>([]);
  const [activeStreams, setActiveStreams] = useState<ActiveStreamRow[]>([]);
  const [loadingRoomId, setLoadingRoomId] = useState<string | null>(null);
  const { requestSalaChoice, dialog: salaChoiceDialog } = useSalaChoiceModal();

  useEffect(() => {
    const loadData = async () => {
      const [{ data: activeData }, conciertoRooms] = await Promise.all([
        supabase
          .from("active_streams")
          .select("user_id,is_live,title,stream_url,playback_url,playback_id,privacy_mode,ticket_price,updated_at")
          .eq("is_live", true),
        fetchPublishedConciertoCards(),
      ]);

      setActiveStreams((activeData ?? []) as ActiveStreamRow[]);
      setUserConciertoRooms(conciertoRooms);
    };

    void loadData();

    const channel = supabase
      .channel("public:nuestras-salas")
      .on("postgres_changes", { event: "*", schema: "public", table: "active_streams" }, () => {
        void loadData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        void loadData();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const creatorRooms: RoomCard[] = useMemo(() => {
    const streamerRooms = podcastStreamers.map((streamer) => ({
      id: streamer.id,
      name: streamer.name,
      image: streamer.avatar,
      subtitle: streamer.immersiveSalaName,
      description: streamer.loungeTitle,
      status: streamer.status === "live" ? "En Vivo" : "Offline",
      channel: buildAgoraChannel(streamer.id),
      isPremium: false,
      priceUsd: 0,
      mp4Url: SALA_MP4_URL_BY_ID[streamer.id],
    }));
    return [...userConciertoRooms, ...shuffleArray([
      ...streamerRooms,
      {
        id: "hablando-huevadas",
        name: "Hablando Huevadas",
        image: "/hablando-huevadas.png",
        subtitle: "Peru",
        description: "Live Show Oficial",
        status: "En Vivo",
        channel: buildAgoraChannel("hablando-huevadas"),
        isPremium: false,
        priceUsd: 0,
        mp4Url: SALA_MP4_URL_BY_ID["hablando-huevadas"],
      },
      {
        id: "michael-jackson",
        name: "Michael Jackson",
        image: "/michael-jackson-avatar.png",
        subtitle: "USA",
        description: "Show inmersivo y hits eternos",
        status: "VIP",
        channel: buildAgoraChannel("michael-jackson"),
        isPremium: false,
        priceUsd: 0,
        mp4Url: SALA_MP4_URL_BY_ID["michael-jackson"],
      },
    ])];
  }, [userConciertoRooms]);

  const beginRoomSession = async (
    room: RoomCard,
    activeStream?: ActiveStreamRow | null,
    options?: { fromSalaCard?: boolean },
  ) => {
    const fromSalaCard = Boolean(options?.fromSalaCard);
    const useLoadingOverlay = !fromSalaCard;
    if (useLoadingOverlay) setLoadingRoomId(room.id);
    try {
      const streamUrlCandidate = activeStream?.stream_url?.trim() || "";
      const playbackUrlCandidate = activeStream?.playback_url?.trim() || "";
      const resolvedChannel = isStreamPlaybackUrl(streamUrlCandidate) ? room.channel : streamUrlCandidate || room.channel;
      const resolvedToken =
        playbackUrlCandidate && !isStreamPlaybackUrl(playbackUrlCandidate) ? playbackUrlCandidate : "";
      const resolvedTitle = activeStream?.title?.trim() || room.name;

      if (handoffSalaCardOnAndroid(room, activeStream, resolvedTitle, requestSalaChoice)) {
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
      if (resolvedStreamUrl) {
        params.set("stream", resolvedStreamUrl);
        try {
          sessionStorage.setItem(audienceStreamSessionKey(resolvedChannel), resolvedStreamUrl);
        } catch {
          /* sessionStorage no disponible */
        }
      }
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
      beginRoomSession(room, linkedStream, { fromSalaCard: true });
      return;
    }
    if (!online) {
      toast.info("Esta sala no está en línea en este momento.");
      return;
    }
    beginRoomSession(room, linkedStream, { fromSalaCard: true });
  };

  return (
    <div className="relative min-h-screen w-full max-w-full overflow-x-clip overflow-y-auto bg-background" data-camera-page-root>
      <Navbar />

      <div className="pointer-events-none fixed inset-0" data-camera-decorative-bg>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_5%,hsl(var(--primary)/0.18),transparent_35%),radial-gradient(circle_at_85%_95%,hsl(290_80%_60%/0.16),transparent_40%)]" />
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
          {/* === SALAS === */}
          <section id="podcast" className="scroll-mt-24">
            <SectionHeader
              badge="Salas Maestras"
              icon={Radio}
              title="VIVE"
              highlight="SALAS"
              subtitle="Todas las salas de creadores en una sola cuadrícula. Clic en tarjeta y entras directo."
              accent="border-primary/40 bg-primary/10 text-primary"
            />
            <div className={salaRoomGridClass}>
              {creatorRooms.map((room, index) => {
                const linkedStream = getRoomActiveStream(room, activeStreams);
                const online = Boolean(linkedStream?.is_live);
                return (
                  <motion.div
                    key={room.id}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ delay: index * 0.06 }}
                  >
                    <article
                      className={`group block w-full rounded-2xl border bg-card/40 text-left backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 ${salaRoomCardPadding} ${
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
                      <h3 className={`${salaRoomTitle} truncate`}>
                        {room.name}
                      </h3>
                      <span
                        className={`${salaRoomStatusBadge} shrink-0 ${
                          online
                            ? "bg-amber-300 text-black"
                            : room.status === "En Vivo"
                            ? "bg-destructive/90 text-destructive-foreground"
                            : room.status === "VIP"
                            ? "bg-amber-500/90 text-black"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {online ? "EN LÍNEA" : "OFFLINE"}
                      </span>
                    </div>
                    <p className={`mb-3 sm:mb-4 ${salaRoomDesc}`}>{room.description}</p>
                    <Button
                      type="button"
                      variant="heroOutline"
                      className={salaRoomPrimaryBtn}
                      onClick={() => handleRoomAccess(room, online)}
                    >
                      <Mic2 className={salaRoomCtaIcon} />
                      Reproducir Video
                    </Button>
                    </article>
                  </motion.div>
                );
              })}
            </div>

          </section>
        </div>
      </main>

      <Footer />

      {salaChoiceDialog}

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

export default NuestrasSalasPage;
