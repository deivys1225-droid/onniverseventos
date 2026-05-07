import { motion } from "framer-motion";
import { Mic2, Radio, Box, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { PayPalButtons } from "@paypal/react-paypal-js";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { podcastStreamers } from "@/data/podcastStreamers";
import { SALA_MP4_URL_BY_ID, livePlaybackAppLink, onniverseDeepLink } from "@/data/salaVideoUrls";
import { extractPlaybackIdFromHlsUrl, livepeerPublicHlsUrl, normalizePlaybackIdForLivepeer } from "@/lib/livepeerPlayback";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { addVaultItem } from "@/lib/vaultItems";
import LivepeerPlayer from "@/components/LivepeerPlayer";
import { detectDeviceKind } from "@/lib/deviceDetection";

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

function resolveStreamPlaybackId(stream?: { playbackUrl: string | null; playbackId: string | null }): string | null {
  const direct = stream?.playbackId?.trim();
  if (direct) {
    const n = normalizePlaybackIdForLivepeer(direct);
    return n || null;
  }
  const fromUrl = stream?.playbackUrl?.trim() ?? "";
  const extracted = extractPlaybackIdFromHlsUrl(fromUrl);
  if (extracted) return extracted;
  const match = fromUrl.match(/\/hls\/([^/?#]+)/i);
  if (match?.[1]) {
    const n = normalizePlaybackIdForLivepeer(match[1]);
    return n || null;
  }
  return null;
}

const NuestrasSalasPage = () => {
  const { user } = useAuth();
  const [communityProfiles, setCommunityProfiles] = useState<
    Array<{ id: string; name: string; avatarUrl: string | null; liveStatus: string; isLive: boolean }>
  >([]);
  const [activeStreamsByUser, setActiveStreamsByUser] = useState<
    Record<
      string,
      { isLive: boolean; privacyMode: "publico" | "privado_ticket"; ticketPrice: number | null; playbackUrl: string | null; playbackId: string | null }
    >
  >({});
  const [paidCommunityRooms, setPaidCommunityRooms] = useState<Record<string, boolean>>({});
  const [viewerPlaybackId, setViewerPlaybackId] = useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = useState<string>("");
  const isMobileDevice = useMemo(() => detectDeviceKind() === "mobile", []);

  useEffect(() => {
    const loadProfiles = async () => {
      let profileRows:
        | Array<{ id: string; full_name: string | null; avatar_url: string | null; live_status?: string | null; is_live?: boolean | null }>
        | null = null;
      const withLive = await supabase
        .from("profiles")
        .select("id,full_name,avatar_url,live_status,is_live")
        .order("updated_at", { ascending: false });
      if (withLive.error) {
        const fallback = await supabase
          .from("profiles")
          .select("id,full_name,avatar_url,live_status")
          .order("updated_at", { ascending: false });
        if (fallback.error) {
          profileRows = [];
        } else {
          profileRows = (fallback.data ?? []) as Array<{
            id: string;
            full_name: string | null;
            avatar_url: string | null;
            live_status?: string | null;
          }>;
        }
      } else {
        profileRows = (withLive.data ?? []) as Array<{
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          live_status?: string | null;
          is_live?: boolean | null;
        }>;
      }
      const normalized = ((profileRows ?? []) as Array<{
        id: string;
        full_name: string | null;
        avatar_url: string | null;
        live_status?: string | null;
        is_live?: boolean | null;
      }>)
        .map((p) => ({
          id: p.id,
          name: p.full_name?.trim() || "Explorador VR",
          avatarUrl: p.avatar_url,
          liveStatus: p.live_status?.trim() || "",
          isLive: Boolean(p.is_live),
        }));
      setCommunityProfiles(normalized);

      const { data: streams } = await supabase
        .from("active_streams")
        .select("user_id,is_live,privacy_mode,ticket_price,playback_url,playback_id")
        .eq("is_live", true);
      const map: Record<
        string,
        { isLive: boolean; privacyMode: "publico" | "privado_ticket"; ticketPrice: number | null; playbackUrl: string | null; playbackId: string | null }
      > = {};
      ((streams ?? []) as Array<{
        user_id: string;
        is_live: boolean;
        privacy_mode: string;
        ticket_price: number | null;
        playback_url: string | null;
        playback_id: string | null;
      }>).forEach((stream) => {
        map[stream.user_id] = {
          isLive: stream.is_live,
          privacyMode: stream.privacy_mode === "privado_ticket" ? "privado_ticket" : "publico",
          ticketPrice: stream.ticket_price,
          playbackUrl: stream.playback_url,
          playbackId: stream.playback_id,
        };
      });
      setActiveStreamsByUser(map);
    };

    void loadProfiles();

    const channel = supabase
      .channel("public:nuestras-salas")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        void loadProfiles();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "active_streams" }, () => {
        void loadProfiles();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const creatorRooms = [
    ...podcastStreamers.map((streamer) => ({
      id: streamer.id,
      name: streamer.name,
      image: streamer.avatar,
      subtitle: streamer.immersiveSalaName,
      description: streamer.loungeTitle,
      status: streamer.status === "live" ? "En Vivo" : "Offline",
      to: `/podcast/${streamer.id}`,
      type: "podcast" as const,
    })),
    {
      id: "hablando-huevadas",
      name: "Hablando Huevadas",
      image: "/hablando-huevadas.png",
      subtitle: "Peru",
      description: "Live Show Oficial",
      status: "En Vivo",
      to: "/teatro/hablando-huevadas",
      type: "teatro" as const,
    },
    {
      id: "michael-jackson",
      name: "Michael Jackson",
      image: "/michael-jackson-avatar.png",
      subtitle: "USA",
      description: "Show inmersivo y hits eternos",
      status: "VIP",
      to: "/teatro/michael-jackson",
      type: "teatro" as const,
    },
  ];

  const communityRooms = useMemo(
    () =>
      communityProfiles.map((profile) => {
        const stream = activeStreamsByUser[profile.id];
        const playbackIdFromStream = resolveStreamPlaybackId(stream);
        const hlsForCard =
          stream?.playbackUrl?.trim() ||
          (playbackIdFromStream ? livepeerPublicHlsUrl(playbackIdFromStream) : null);
        const reallyLive = Boolean(stream?.isLive && hlsForCard);
        return {
          id: `community-${profile.id}`,
          profileUserId: profile.id,
          name: profile.name,
          image: profile.avatarUrl?.trim() || "/placeholder.svg",
          liveStatus: profile.liveStatus,
          subtitle: "Comunidad Onniverso",
          description: "Nuevo creador registrado en la plataforma.",
          status: reallyLive ? "En Vivo" : "",
          to: "/inicio",
          type: "community" as const,
        };
      }),
    [activeStreamsByUser, communityProfiles],
  );

  const markPaidAndOpen = (roomId: string, roomTo: string) => {
    setPaidCommunityRooms((prev) => ({ ...prev, [roomId]: true }));
    window.location.href = roomTo;
  };
  const openLiveByDevice = (sourcePlaybackId: string | null, title: string, hlsUrl?: string | null) => {
    const source = sourcePlaybackId?.trim() || hlsUrl?.trim() || "";
    if (!source) return;
    if (isMobileDevice) {
      /** App Android: App Link https://vivevr.vercel.app/live/{id} abre MainActivity + ruta /live (Capacitor). */
      const pid =
        sourcePlaybackId?.trim() ||
        (hlsUrl ? extractPlaybackIdFromHlsUrl(hlsUrl) : null) ||
        (!source.includes("://") && !source.toLowerCase().includes(".m3u8") ? source : null) ||
        extractPlaybackIdFromHlsUrl(source);
      const cleanPid = pid?.trim();
      if (cleanPid && !cleanPid.includes("://") && !cleanPid.toLowerCase().endsWith(".m3u8")) {
        window.location.href = livePlaybackAppLink(cleanPid);
        return;
      }
      const urlToOpen =
        hlsUrl?.trim() || (source.includes("://") ? source : livepeerPublicHlsUrl(source));
      window.location.href = onniverseDeepLink(urlToOpen);
      return;
    }
    setViewerPlaybackId(source);
    setViewerTitle(title);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <Navbar />

      <div className="pointer-events-none fixed inset-0">
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

      <main className="relative z-10 px-6 pt-20 pb-20">
        <div className="container mx-auto max-w-6xl">
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
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {creatorRooms.map((room, index) => {
                const salaMp4 = SALA_MP4_URL_BY_ID[room.id];
                const onniverseAppHref =
                  salaMp4 !== undefined ? onniverseDeepLink(salaMp4) : null;

                return (
                  <motion.div
                    key={room.id}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ delay: index * 0.06 }}
                  >
                    {onniverseAppHref != null ? (
                      <a
                        href={onniverseAppHref}
                        className="group block rounded-2xl border border-border/50 bg-card/40 p-5 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-primary/50 hover:shadow-[0_0_45px_-10px_hsl(var(--primary)/0.5)]"
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
                          <h3 className="font-display text-lg font-semibold text-foreground">
                            {room.name}
                          </h3>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-display font-bold uppercase tracking-wide ${
                              room.status === "En Vivo"
                                ? "bg-destructive/90 text-destructive-foreground"
                                : room.status === "VIP"
                                ? "bg-amber-500/90 text-black"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {room.status}
                          </span>
                        </div>
                        <p className="mb-4 text-sm text-muted-foreground">{room.description}</p>
                        <span className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 py-2.5 text-xs font-display font-bold uppercase tracking-wide text-primary transition group-hover:bg-primary/20 group-hover:shadow-[0_0_24px_-4px_hsl(var(--primary)/0.6)]">
                          <Mic2 className="h-4 w-4" />
                          Entrar a sala
                        </span>
                      </a>
                    ) : (
                      <Link
                        to={room.to}
                        className="group block rounded-2xl border border-border/50 bg-card/40 p-5 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-primary/50 hover:shadow-[0_0_45px_-10px_hsl(var(--primary)/0.5)]"
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
                      <h3 className="font-display text-lg font-semibold text-foreground">
                        {room.name}
                      </h3>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-display font-bold uppercase tracking-wide ${
                          room.status === "En Vivo"
                            ? "bg-destructive/90 text-destructive-foreground"
                            : room.status === "VIP"
                            ? "bg-amber-500/90 text-black"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {room.status}
                      </span>
                    </div>
                    <p className="mb-4 text-sm text-muted-foreground">{room.description}</p>
                    <span className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 py-2.5 text-xs font-display font-bold uppercase tracking-wide text-primary transition group-hover:bg-primary/20 group-hover:shadow-[0_0_24px_-4px_hsl(var(--primary)/0.6)]">
                      <Mic2 className="h-4 w-4" />
                      Entrar a sala
                    </span>
                      </Link>
                    )}
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-14">
              <h3 className="mb-5 text-center font-display text-2xl font-bold tracking-tight text-foreground">
                Salas de la <span className="text-gradient-neon">Comunidad</span>
              </h3>
              <p className="mx-auto mb-7 max-w-2xl text-center text-sm text-muted-foreground">
                Usuarios registrados que crean su propio espacio. Las salas oficiales aprobadas por el equipo Tikes se
                mantienen arriba.
              </p>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {communityRooms.length === 0 && (
                  <div className="col-span-full rounded-2xl border border-border/50 bg-card/35 p-6 text-center text-sm text-muted-foreground backdrop-blur-xl">
                    Aun no hay salas comunitarias registradas.
                  </div>
                )}
                {communityRooms.map((room, index) => (
                  <motion.div
                    key={room.id}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ delay: index * 0.05 }}
                  >
                    {(() => {
                      const stream = activeStreamsByUser[room.profileUserId];
                      const playbackId = resolveStreamPlaybackId(stream);
                      const storedHls = stream?.playbackUrl?.trim() || null;
                      const hlsUrl = storedHls ?? (playbackId ? livepeerPublicHlsUrl(playbackId) : null);
                      const hasWatchable = Boolean(stream?.isLive && hlsUrl);
                      const requiresTicket = Boolean(stream?.isLive && stream.privacyMode === "privado_ticket");
                      const isLiveNow = Boolean(hasWatchable || (stream?.isLive && requiresTicket));
                      const isPublicLive = Boolean(stream?.isLive && stream.privacyMode === "publico" && hasWatchable);
                      const paid = paidCommunityRooms[room.id] === true;
                      const appLiveHref =
                        playbackId != null && playbackId !== ""
                          ? livePlaybackAppLink(playbackId)
                          : hlsUrl != null && hlsUrl !== ""
                            ? onniverseDeepLink(hlsUrl)
                            : null;
                      const liveCard = isPublicLive && Boolean(hlsUrl);
                      const CardTag = liveCard ? "button" : "div";

                      return (
                        <CardTag
                          {...(liveCard
                            ? {
                                type: "button",
                                onClick: () => {
                                  openLiveByDevice(playbackId, room.name, hlsUrl);
                                },
                              }
                            : {})}
                          className={`group relative block rounded-2xl border bg-card/40 p-5 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 ${
                            isLiveNow
                              ? "border-amber-300/80 shadow-[0_0_45px_-8px_rgba(251,191,36,0.9)] hover:border-yellow-200/90 hover:shadow-[0_0_65px_-6px_rgba(250,204,21,1)]"
                              : "border-border/50 hover:border-primary/50 hover:shadow-[0_0_45px_-10px_hsl(var(--primary)/0.5)]"
                          }`}
                        >
                          {isLiveNow && (
                            <div className="pointer-events-none absolute inset-0 rounded-2xl border border-amber-300/80 opacity-80 animate-pulse" />
                          )}
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
                            {room.status === "En Vivo" && (
                              <span className="rounded-full bg-amber-300 px-2.5 py-1 text-[10px] font-display font-bold uppercase tracking-wide text-black">
                                {room.status}
                              </span>
                            )}
                          </div>
                          <p className="mb-4 text-sm text-muted-foreground">{room.description}</p>
                          {(() => {
                            if (requiresTicket && !paid) {
                              const ticketValue = Number(stream?.ticketPrice ?? 0);
                              const price = Number.isFinite(ticketValue) && ticketValue > 0 ? ticketValue : 5;
                              return (
                                <div className="space-y-2">
                                  <p className="text-[11px] text-amber-200">
                                    Sala privada con ticket activo (${price.toFixed(2)} USD)
                                  </p>
                                  <div className="rounded-xl border border-[#ffc439]/50 bg-[#ffc439]/10 p-2">
                                    <PayPalButtons
                                      style={{ layout: "vertical", color: "gold", shape: "rect", label: "pay", height: 40 }}
                                      createOrder={(_data, actions) =>
                                        actions.order.create({
                                          intent: "CAPTURE",
                                          purchase_units: [
                                            {
                                              amount: { currency_code: "USD", value: price.toFixed(2) },
                                              description: `Ticket sala privada - ${room.name}`,
                                            },
                                          ],
                                        })
                                      }
                                      onApprove={async (_data, actions) => {
                                        if (!actions.order) return;
                                        await actions.order.capture();
                                        if (user?.id) {
                                          addVaultItem(user.id, {
                                            type: "ticket",
                                            title: `Ticket - ${room.name}`,
                                            priceUsd: price,
                                            thumbnailUrl: room.image,
                                          });
                                        }
                                        toast.success("Pago confirmado. Entrando a la sala...");
                                        markPaidAndOpen(room.id, room.to);
                                      }}
                                    />
                                  </div>
                                </div>
                              );
                            }
                            if ((isPublicLive || paid) && !liveCard) {
                              return appLiveHref ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    openLiveByDevice(playbackId, room.name, hlsUrl);
                                  }}
                                >
                                  <span className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 py-2.5 text-xs font-display font-bold uppercase tracking-wide text-primary transition group-hover:bg-primary/20 group-hover:shadow-[0_0_24px_-4px_hsl(var(--primary)/0.6)]">
                                    <Mic2 className="h-4 w-4" />
                                    Ver live
                                  </span>
                                </button>
                              ) : (
                                <span className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/10 py-2.5 text-xs font-display font-bold uppercase tracking-wide text-emerald-200">
                                  <Mic2 className="h-4 w-4" />
                                  En vivo (sin playback aun)
                                </span>
                              );
                            }
                            return liveCard ? (
                              <span className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-300/50 bg-emerald-500/15 py-2.5 text-xs font-display font-bold uppercase tracking-wide text-emerald-100">
                                <Mic2 className="h-4 w-4" />
                                Entrar al stream
                              </span>
                            ) : null;
                          })()}
                        </CardTag>
                      );
                    })()}
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
      {!isMobileDevice && viewerPlaybackId && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <button
            type="button"
            aria-label="Cerrar viewer live"
            className="absolute inset-0"
            onClick={() => {
              setViewerPlaybackId(null);
              setViewerTitle("");
            }}
          />
          <div className="relative z-10 w-full max-w-5xl rounded-2xl border border-primary/30 bg-background/95 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-xl font-bold text-foreground">{viewerTitle || "Live"}</h3>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  setViewerPlaybackId(null);
                  setViewerTitle("");
                }}
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <LivepeerPlayer playbackId={viewerPlaybackId} title={`Live ${viewerTitle || viewerPlaybackId}`} />
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default NuestrasSalasPage;
