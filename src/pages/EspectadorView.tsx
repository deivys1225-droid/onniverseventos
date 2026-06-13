import { useEffect, useMemo, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { MuxHlsPlayer } from "@/components/streaming/LivepeerHlsPlayer";
import { podcastStreamers } from "@/data/podcastStreamers";
import { NativePlaybackRouteGuard } from "@/components/NativePlaybackRouteGuard";
import { isNativeAndroid, shouldUseWebLivePlayer } from "@/lib/nativePlayback";
import {
  audienceStreamSessionKey,
  isStreamPlaybackUrl,
  muxPlaybackIdToHlsUrl,
  resolveLiveTransmissionUrl,
  resolvePlaybackIdFromActiveStreamRow,
  resolveSalaVodPlaybackUrl,
  isSalaYoutubeVod,
} from "@/lib/audiencePlayback";
import { muxPlaybackIdFromHlsUrl, sanitizeMuxPlaybackId } from "@/lib/muxPlaybackId";
import { buildAgoraChannel } from "@/lib/agoraRooms";
import type { ActiveStreamRow } from "@/lib/salaRoomCards";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import YouTubePlayer from "@/components/YouTubePlayer";

/** `al-universo-{id}` → id de podcast si existe en el directorio (escena inmersiva). */
function podcastIdFromChannel(channelName: string): string | null {
  const prefix = "al-universo-";
  const n = channelName.trim().toLowerCase();
  if (!n.startsWith(prefix)) return null;
  const id = n.slice(prefix.length);
  if (!id) return null;
  return podcastStreamers.some((s) => s.id === id) ? id : null;
}

type AudienceSceneKey = "split" | "immersive" | "mix";

function tryAndroidNativeSceneSelector(preferred: AudienceSceneKey): boolean {
  if (Capacitor.getPlatform() !== "android") return false;
  const bridge = (window as Window & { AndroidScene?: { openSceneSelector?: (p: string) => void } }).AndroidScene;
  if (typeof bridge?.openSceneSelector === "function") {
    bridge.openSceneSelector(preferred);
    return true;
  }
  return false;
}

const EspectadorView = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { channel } = useParams<{ channel: string }>();
  const [searchParams] = useSearchParams();
  const channelName = useMemo(() => (channel?.trim() ? decodeURIComponent(channel) : buildAgoraChannel("main")), [channel]);
  const roomTitle = (searchParams.get("title") ?? "Sala en vivo").trim();
  const fallbackMp4 = (searchParams.get("mp4") ?? "").trim();
  const vodPlaybackUrl = useMemo(() => resolveSalaVodPlaybackUrl(fallbackMp4), [fallbackMp4]);
  const vodIsYoutube = useMemo(() => isSalaYoutubeVod(fallbackMp4), [fallbackMp4]);
  const streamPlaybackUrl = (searchParams.get("stream") ?? "").trim();
  const playbackIdParam = (searchParams.get("playbackId") ?? searchParams.get("playback_id") ?? "").trim();
  const sessionStreamUrl = useMemo(() => {
    try {
      return sessionStorage.getItem(audienceStreamSessionKey(channelName)) ?? "";
    } catch {
      return "";
    }
  }, [channelName]);
  const effectiveStreamParam = streamPlaybackUrl || sessionStreamUrl;
  const forcedMode = (searchParams.get("mode") ?? "").trim().toLowerCase();
  const useVodMode = forcedMode === "vod" && fallbackMp4.length > 0;
  const useWebMuxPlayer = shouldUseWebLivePlayer();
  const blockWebLiveOnAndroid = isNativeAndroid() && !useVodMode;

  const [activeStreamRow, setActiveStreamRow] = useState<ActiveStreamRow | null>(null);
  const [loadingPlayback, setLoadingPlayback] = useState(!useVodMode);
  const [error, setError] = useState<string | null>(null);
  const playerRootRef = useRef<HTMLDivElement>(null);

  const nativeSceneActionsRef = useRef({
    split: () => {},
    immersive: () => {},
    mix: () => {},
  });

  useEffect(() => {
    if (useVodMode) {
      setLoadingPlayback(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoadingPlayback(true);
      setError(null);

      const routeKey = channelName.trim();
      const { data } = await supabase
        .from("active_streams")
        .select("user_id,is_live,title,stream_url,playback_url,playback_id,privacy_mode,ticket_price,updated_at")
        .eq("is_live", true);

      if (cancelled) return;

      const rows = (data ?? []) as ActiveStreamRow[];
      const match =
        rows.find((row) => row.stream_url?.trim() === routeKey) ??
        rows.find((row) => row.playback_url?.trim() === routeKey) ??
        rows.find((row) => row.playback_id === routeKey) ??
        rows.find((row) => routeKey.includes(row.user_id)) ??
        null;

      setActiveStreamRow(match);
      setLoadingPlayback(false);
      if (!match && !effectiveStreamParam) {
        setError("No hay transmisión en vivo para esta sala. Espera a que el emisor conecte Mux.");
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [channelName, effectiveStreamParam, useVodMode]);

  const playbackUrl = useMemo(() => {
    if (useVodMode) return null;
    return resolveLiveTransmissionUrl({
      streamParam: effectiveStreamParam,
      mp4Param: fallbackMp4,
      channelParam: channelName,
      activeStream: activeStreamRow,
    });
  }, [useVodMode, effectiveStreamParam, fallbackMp4, channelName, activeStreamRow]);

  const playbackId = useMemo(() => {
    if (useVodMode) return null;
    const fromQuery = sanitizeMuxPlaybackId(playbackIdParam);
    if (fromQuery) return fromQuery;
    const fromRow = resolvePlaybackIdFromActiveStreamRow(activeStreamRow);
    if (fromRow) return fromRow;
    return (
      muxPlaybackIdFromHlsUrl(effectiveStreamParam) ??
      muxPlaybackIdFromHlsUrl(playbackUrl) ??
      null
    );
  }, [useVodMode, playbackIdParam, activeStreamRow, effectiveStreamParam, playbackUrl]);

  /** URL canónica en navegador web (sin redirección automática en APK). */
  useEffect(() => {
    if (!useWebMuxPlayer || useVodMode || !playbackId) return;
    const streamInUrl = (searchParams.get("stream") ?? "").trim();
    const idInUrl = sanitizeMuxPlaybackId(playbackIdParam);
    if (idInUrl === playbackId && !streamInUrl.includes("stream.mux.com")) return;

    const next = new URLSearchParams(searchParams);
    next.set("playbackId", playbackId);
    next.delete("stream");
    const hls = playbackUrl ?? muxPlaybackIdToHlsUrl(playbackId);
    if (hls) {
      try {
        sessionStorage.setItem(audienceStreamSessionKey(channelName), hls);
      } catch {
        /* ignore */
      }
    }
    navigate(`${location.pathname}?${next.toString()}`, { replace: true });
  }, [useVodMode, useWebMuxPlayer, playbackId, playbackIdParam, playbackUrl, channelName, location.pathname, navigate, searchParams]);

  const goMixVod = () => {
    if (!fallbackMp4) {
      setError("Esta sala no incluye un MP4 para la vista MIX.");
      return;
    }
    const next = new URLSearchParams(searchParams);
    next.set("mode", "vod");
    navigate(`/sala/espectador/${encodeURIComponent(channelName)}?${next.toString()}`);
  };

  const goVrPc = () => {
    const q = searchParams.toString();
    navigate(q ? `/pc?${q}` : "/pc");
  };

  const goPantallaDividida = () => {
    setError(null);
    goVrPc();
  };

  const goEscenaInmersiva = () => {
    setError(null);
    const podcastId = podcastIdFromChannel(channelName);
    const q = searchParams.toString();
    const suffix = q ? `?${q}` : "";
    if (podcastId) {
      navigate(`/podcast/${encodeURIComponent(podcastId)}${suffix}`);
      return;
    }
    toast.info("Para esta sala no hay escena inmersiva en el directorio; abriendo el hub de podcasts.");
    navigate(`/podcast-hub${suffix}`);
  };

  nativeSceneActionsRef.current.split = goPantallaDividida;
  nativeSceneActionsRef.current.immersive = goEscenaInmersiva;
  nativeSceneActionsRef.current.mix = goMixVod;

  useEffect(() => {
    if (!useWebMuxPlayer) return;
    const w = window as Window & { __onniversoNativeDispatch?: (scene: string) => void };
    w.__onniversoNativeDispatch = (scene: string) => {
      if (scene === "immersive") nativeSceneActionsRef.current.immersive();
      else if (scene === "mix") nativeSceneActionsRef.current.mix();
      else nativeSceneActionsRef.current.split();
    };
    return () => {
      delete w.__onniversoNativeDispatch;
    };
  }, [useWebMuxPlayer]);

  if (blockWebLiveOnAndroid) {
    return (
      <div className="relative min-h-screen bg-background">
        <Navbar />
        <main className="px-4 pt-24">
          <NativePlaybackRouteGuard>{null}</NativePlaybackRouteGuard>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <Navbar />
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,hsl(var(--primary)/0.2),transparent_45%),radial-gradient(circle_at_80%_92%,hsl(290_80%_60%/0.15),transparent_46%)]" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
      </div>

      <main className="relative z-10 px-3 pb-10 pt-24 md:px-4">
        <section className="mx-auto w-full max-w-[94rem] space-y-4">
          <div className="rounded-2xl border border-cyan-300/35 bg-card/35 p-2 shadow-[0_0_50px_-18px_rgba(34,211,238,0.9)] backdrop-blur-xl md:p-3">
            <div ref={playerRootRef} className="w-full">
              {useVodMode ? (
                vodIsYoutube && vodPlaybackUrl ? (
                  <YouTubePlayer embedUrl={vodPlaybackUrl} title={roomTitle} variant="cinema" />
                ) : (
                  <video
                    src={fallbackMp4}
                    autoPlay
                    controls
                    playsInline
                    className="aspect-video w-full overflow-hidden rounded-xl border border-cyan-300/45 bg-black shadow-[0_0_48px_-10px_rgba(34,211,238,0.95)]"
                  />
                )
              ) : loadingPlayback ? (
                <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-cyan-300/45 bg-black text-sm text-muted-foreground">
                  Cargando transmisión Mux…
                </div>
              ) : !useWebMuxPlayer ? (
                <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-xl border border-cyan-300/45 bg-black/50 p-6 text-center text-sm text-muted-foreground">
                  <p className="font-semibold text-cyan-50">Reproducción nativa (Android)</p>
                  <p className="max-w-md text-xs">
                    Abre la sala desde Nuestras salas y elige pantalla dividida, mixta o escena 360.
                  </p>
                </div>
              ) : playbackId ? (
                <MuxHlsPlayer
                  key={playbackId}
                  playbackId={playbackId}
                  title={roomTitle}
                  manualStart
                />
              ) : (
                <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-dashed border-cyan-300/35 bg-black/50 p-6 text-center text-sm text-muted-foreground">
                  Sin playback ID de Mux. El emisor debe iniciar transmisión desde la sala emisor.
                </div>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-xs text-cyan-100">
                {roomTitle} · {useVodMode ? (vodIsYoutube ? "YouTube" : "MP4") : "Mux en vivo"} · {channelName}
              </p>
              <Button type="button" variant="outline" onClick={() => navigate("/nuestras-salas")}>
                Salir de la Sala
              </Button>
            </div>

            {error && (
              <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default EspectadorView;
