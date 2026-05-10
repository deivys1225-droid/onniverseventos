import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Headset, Layers2, RefreshCw } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import AgoraRTC, { type IAgoraRTCClient, type IAgoraRTCRemoteUser } from "agora-rtc-sdk-ng";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { podcastStreamers } from "@/data/podcastStreamers";
import { buildAgoraChannel } from "@/lib/agoraRooms";
import { toast } from "sonner";

const SELENA_BIDI_BOM_MP4 =
  "https://res.cloudinary.com/dfsabdxup/video/upload/v1777757336/Selena_-_Bidi_Bidi_Bom_Bom_hcvcfk.mp4";

const APP_ID = (import.meta.env.NEXT_PUBLIC_AGORA_APP_ID as string | undefined)?.trim() ?? "";
const AUDIENCE_TOKEN =
  (import.meta.env.NEXT_PUBLIC_AGORA_AUDIENCE_TOKEN as string | undefined)?.trim() ??
  (import.meta.env.NEXT_PUBLIC_AGORA_TOKEN as string | undefined)?.trim() ??
  "";

/** `al-universo-{id}` → id de podcast si existe en el directorio (escena inmersiva). */
function podcastIdFromAgoraChannel(channelName: string): string | null {
  const prefix = "al-universo-";
  const n = channelName.trim().toLowerCase();
  if (!n.startsWith(prefix)) return null;
  const id = n.slice(prefix.length);
  if (!id) return null;
  return podcastStreamers.some((s) => s.id === id) ? id : null;
}

type AudienceSceneKey = "split" | "immersive" | "mix";

/** Solo Android APK: abre el selector nativo (AlertDialog). En web/iOS devuelve false. */
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
  const { channel } = useParams<{ channel: string }>();
  const [searchParams] = useSearchParams();
  const channelName = useMemo(() => (channel?.trim() ? decodeURIComponent(channel) : buildAgoraChannel("main")), [channel]);
  const roomTitle = (searchParams.get("title") ?? "Sala en vivo").trim();
  const inheritedToken = (searchParams.get("token") ?? "").trim();
  const fallbackMp4 = (searchParams.get("mp4") ?? "").trim();
  const forcedMode = (searchParams.get("mode") ?? "").trim().toLowerCase();
  const useVodMode = forcedMode === "vod" && fallbackMp4.length > 0;
  /** Evita unirse a Agora hasta elegir escena (salvo VOD directo por URL). */
  const [scenePhase, setScenePhase] = useState<"selector" | "playing">(() => (useVodMode ? "playing" : "selector"));
  const [status, setStatus] = useState("Listo para conectar");
  const [connecting, setConnecting] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const remoteUsersRef = useRef<Record<string, IAgoraRTCRemoteUser>>({});
  const remoteContainerId = "agora-audience-remote-player";

  /** Callbacks para el puente Android → JS tras elegir escena en el diálogo nativo. */
  const nativeSceneActionsRef = useRef({
    split: () => {},
    immersive: () => {},
    mix: () => {},
  });

  const mountFirstRemoteUser = useCallback(() => {
    const users = Object.values(remoteUsersRef.current);
    const first = users.find((u) => u.videoTrack);
    const remoteContainer = document.getElementById(remoteContainerId);
    if (!remoteContainer) return;

    if (!first?.videoTrack) {
      remoteContainer.innerHTML =
        '<p class="text-sm text-muted-foreground">Esperando transmisión en vivo...</p>';
      return;
    }
    remoteContainer.innerHTML = "";
    first.videoTrack.play(remoteContainer);
  }, []);

  const leaveAudienceRoom = useCallback(async () => {
    const client = clientRef.current;
    clientRef.current = null;
    remoteUsersRef.current = {};
    if (client) {
      await client.leave();
    }
    setJoined(false);
    setConnecting(false);
    setStatus("Desconectado");
  }, []);

  const joinAudienceRoom = useCallback(async () => {
    if (!APP_ID) {
      setError("Falta NEXT_PUBLIC_AGORA_APP_ID en .env.local");
      setStatus("Configuración incompleta");
      return;
    }
    const channelToJoin = channelName.trim();
    if (!channelToJoin) {
      setError("No se encontró canal para esta sala.");
      return;
    }

    try {
      setError(null);
      setConnecting(true);
      setStatus(`Uniendo a ${channelToJoin}...`);
      await leaveAudienceRoom();

      const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
      clientRef.current = client;
      await client.setClientRole("audience"); // Forzado: siempre token/rol de audiencia.

      client.on("user-published", async (user, mediaType) => {
        remoteUsersRef.current[String(user.uid)] = user;
        await client.subscribe(user, mediaType);
        if (mediaType === "video") mountFirstRemoteUser();
        if (mediaType === "audio") user.audioTrack?.play();
      });

      client.on("user-unpublished", (user, mediaType) => {
        if (mediaType === "video") mountFirstRemoteUser();
        if (!user.hasVideo && !user.hasAudio) {
          delete remoteUsersRef.current[String(user.uid)];
        }
      });

      client.on("user-left", (user) => {
        delete remoteUsersRef.current[String(user.uid)];
        mountFirstRemoteUser();
      });

      const audienceToken = inheritedToken || AUDIENCE_TOKEN.trim();
      const joinWithTimeout = async (token: string | null) => {
        const joinTask = client.join(APP_ID, channelToJoin, token, null);
        const joinTimeout = new Promise<never>((_, reject) => {
          window.setTimeout(() => reject(new Error("Timeout al conectar con Agora (10s).")), 10000);
        });
        await Promise.race([joinTask, joinTimeout]);
      };

      try {
        await joinWithTimeout(audienceToken || null);
      } catch (joinErr) {
        const rawJoinMessage = joinErr instanceof Error ? joinErr.message : String(joinErr);
        const normalizedJoinMessage = rawJoinMessage.toUpperCase();
        const isStaticKeyProjectError =
          normalizedJoinMessage.includes("CAN_NOT_GET_GATEWAY_SERVER") &&
          normalizedJoinMessage.includes("DYNAMIC USE STATIC KEY");
        if (!isStaticKeyProjectError) throw joinErr;
        // Proyecto Agora en modo static key: audiencia entra sin token.
        await joinWithTimeout(null);
      }
      setJoined(true);
      setConnecting(false);
      setStatus("En vivo (audiencia)");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo conectar a la sala.";
      setError(msg);
      setStatus("Error de conexión");
      setConnecting(false);
    }
  }, [channelName, inheritedToken, leaveAudienceRoom, mountFirstRemoteUser]);

  useEffect(() => {
    return () => {
      void leaveAudienceRoom();
    };
  }, [leaveAudienceRoom]);

  useEffect(() => {
    if (useVodMode) setScenePhase("playing");
  }, [useVodMode]);

  useEffect(() => {
    if (useVodMode) return;
    if (scenePhase !== "playing") return;
    void joinAudienceRoom();
  }, [joinAudienceRoom, useVodMode, scenePhase]);

  const openOnniversWeb = () => {
    window.open("https://www.onnivers.com/", "_blank", "noopener,noreferrer");
  };

  const goMixVod = () => {
    if (!fallbackMp4) {
      setError("Esta sala no incluye un MP4 para la vista MIX. Pide al anfitrión el enlace con parámetro mp4.");
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

  /** Pantalla dividida / escena PC — mismo criterio que el botón «VR/PC» del selector. */
  const goPantallaDividida = () => {
    setError(null);
    goVrPc();
  };

  /** Escena inmersiva 360 (PodcastSala360) — mismo criterio que «360°» del selector. */
  const goEscenaInmersiva = () => {
    setError(null);
    const podcastId = podcastIdFromAgoraChannel(channelName);
    const q = searchParams.toString();
    const suffix = q ? `?${q}` : "";
    if (podcastId) {
      navigate(`/podcast/${encodeURIComponent(podcastId)}${suffix}`);
      return;
    }
    toast.info("Para esta sala no hay escena inmersiva en el directorio; abriendo el hub de podcasts.");
    navigate(`/podcast-hub${suffix}`);
  };

  const goSelenaBidiVod = () => {
    setError(null);
    const next = new URLSearchParams(searchParams);
    next.set("mode", "vod");
    next.set("mp4", SELENA_BIDI_BOM_MP4);
    next.set("title", "Selena — Bidi Bidi Bom Bom");
    navigate(`/sala/espectador/${encodeURIComponent(channelName)}?${next.toString()}`);
  };

  nativeSceneActionsRef.current.split = goPantallaDividida;
  nativeSceneActionsRef.current.immersive = goEscenaInmersiva;
  nativeSceneActionsRef.current.mix = goMixVod;

  useEffect(() => {
    const w = window as Window & { __onniversoNativeDispatch?: (scene: string) => void };
    w.__onniversoNativeDispatch = (scene: string) => {
      if (scene === "immersive") nativeSceneActionsRef.current.immersive();
      else if (scene === "mix") nativeSceneActionsRef.current.mix();
      else nativeSceneActionsRef.current.split();
    };
    return () => {
      delete w.__onniversoNativeDispatch;
    };
  }, []);

  /** Barra inferior: en Android abre el selector nativo; en PC igual que antes (directo). */
  const onAudienceBarSplit = () => {
    if (tryAndroidNativeSceneSelector("split")) return;
    goPantallaDividida();
  };
  const onAudienceBarImmersive = () => {
    if (tryAndroidNativeSceneSelector("immersive")) return;
    goEscenaInmersiva();
  };
  const onAudienceBarMix = () => {
    if (tryAndroidNativeSceneSelector("mix")) return;
    goMixVod();
  };

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

      <main className="relative z-10 px-4 pb-10 pt-24 md:px-6">
        {scenePhase === "selector" && !useVodMode && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="scene-selector-title"
          >
            <div className="w-full max-w-lg rounded-2xl border border-cyan-300/45 bg-card/90 p-5 shadow-[0_0_60px_-12px_rgba(34,211,238,0.85)] backdrop-blur-xl">
              <h2 id="scene-selector-title" className="mb-1 text-center text-lg font-bold tracking-tight text-cyan-50">
                Selector de escena
              </h2>
              <p className="mb-2 text-center text-xs text-muted-foreground">Elige cómo ver esta sala o abre el sitio.</p>
              <p className="mb-4 text-center text-[10px] leading-snug text-muted-foreground/85">
                ¿No ves botones nuevos en la app Android? En la carpeta del proyecto ejecuta{" "}
                <span className="font-mono text-cyan-200/90">npm run sync:android</span> y vuelve a instalar el APK.
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setScenePhase("playing");
                  }}
                  className="rounded-xl border border-cyan-300/40 bg-black/40 px-3 py-3 text-left text-sm font-semibold text-cyan-50 transition hover:border-cyan-300/80 hover:bg-black/55"
                >
                  Reproductor
                  <span className="mt-1 block text-[10px] font-normal text-muted-foreground">Agora en vivo</span>
                </button>
                <button
                  type="button"
                  onClick={goEscenaInmersiva}
                  className="rounded-xl border border-cyan-300/40 bg-black/40 px-3 py-3 text-left text-sm font-semibold text-cyan-50 transition hover:border-cyan-300/80 hover:bg-black/55"
                >
                  Escena inmersiva
                  <span className="mt-1 block text-[10px] font-normal text-muted-foreground">360° · sala podcast</span>
                </button>
                <button
                  type="button"
                  onClick={goMixVod}
                  className="rounded-xl border border-fuchsia-300/40 bg-black/40 px-3 py-3 text-left text-sm font-semibold text-fuchsia-50 transition hover:border-fuchsia-300/80 hover:bg-black/55"
                >
                  Escena mixta
                  <span className="mt-1 block text-[10px] font-normal text-muted-foreground">MP4 si hay enlace (MIX)</span>
                </button>
                <button
                  type="button"
                  onClick={goPantallaDividida}
                  className="rounded-xl border border-violet-300/40 bg-black/40 px-3 py-3 text-left text-sm font-semibold text-violet-50 transition hover:border-violet-300/80 hover:bg-black/55"
                >
                  Pantalla dividida
                  <span className="mt-1 block text-[10px] font-normal text-muted-foreground">VR / escena PC</span>
                </button>
                <button
                  type="button"
                  onClick={openOnniversWeb}
                  className="rounded-xl border border-emerald-400/45 bg-black/40 px-3 py-3 text-left text-sm font-semibold text-emerald-100 transition hover:border-emerald-300/85 hover:bg-black/55"
                >
                  onnivers
                  <span className="mt-1 block text-[10px] font-normal text-muted-foreground">www.onnivers.com</span>
                </button>
                <button
                  type="button"
                  onClick={goSelenaBidiVod}
                  className="col-span-2 sm:col-span-3 rounded-xl border border-rose-400/45 bg-black/40 px-3 py-3 text-left text-sm font-semibold text-rose-100 transition hover:border-rose-300/85 hover:bg-black/55"
                >
                  Selena · Bidi Bidi
                  <span className="mt-1 block text-[10px] font-normal text-muted-foreground">Video Cloudinary</span>
                </button>
              </div>
              {error && (
                <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">{error}</p>
              )}
              <button
                type="button"
                onClick={() => navigate("/nuestras-salas")}
                className="mt-4 w-full rounded-lg border border-border/60 bg-transparent py-2 text-xs text-muted-foreground hover:bg-muted/20"
              >
                Volver a salas
              </button>
            </div>
          </div>
        )}

        <section className="mx-auto max-w-6xl space-y-4">
          <div className="rounded-2xl border border-cyan-300/35 bg-card/35 p-3 shadow-[0_0_50px_-18px_rgba(34,211,238,0.9)] backdrop-blur-xl md:p-4">
            {useVodMode ? (
              <video
                src={fallbackMp4}
                autoPlay
                controls
                playsInline
                className="aspect-video w-full overflow-hidden rounded-xl border border-cyan-300/45 bg-black shadow-[0_0_48px_-10px_rgba(34,211,238,0.95)]"
              />
            ) : (
              <div
                id={remoteContainerId}
                className="aspect-video w-full overflow-hidden rounded-xl border border-cyan-300/45 bg-black shadow-[0_0_48px_-10px_rgba(34,211,238,0.95)]"
              />
            )}
            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-xs text-cyan-100">
                {roomTitle} · {useVodMode ? "Reproducción automática MP4" : `Canal: ${channelName} · Estado: ${status}`}
              </p>
              <Button type="button" variant="outline" onClick={() => navigate("/nuestras-salas")}>
                Salir de la Sala
              </Button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
              <button
                type="button"
                title="Pantalla dividida (mismo que el selector)"
                onClick={() => {
                  const b = (window as Window & { AndroidBridge?: { onVrClick?: () => void } }).AndroidBridge;
                  if (typeof b?.onVrClick === "function") {
                    b.onVrClick();
                    return;
                  }
                  window.location.assign("https://onnivers.com/go/vr");
                }}
                className="group flex flex-col items-center justify-center gap-1.5 rounded-xl border border-violet-400/40 bg-black/35 px-2 py-3 text-violet-50 shadow-[0_0_28px_-12px_rgba(139,92,246,0.85)] transition hover:border-violet-300/75 hover:bg-black/50 sm:flex-row sm:gap-2 sm:py-3.5"
              >
                <Headset className="h-5 w-5 shrink-0 opacity-90 transition group-hover:scale-105" aria-hidden />
                <span className="text-xs font-semibold tracking-wide sm:text-sm">VR</span>
              </button>
              <button
                type="button"
                title="Escena inmersiva (mismo que el selector)"
                onClick={() => {
                  const b = (window as Window & { AndroidBridge?: { on360Click?: () => void } }).AndroidBridge;
                  if (typeof b?.on360Click === "function") {
                    b.on360Click();
                    return;
                  }
                  window.location.assign("https://onnivers.com/go/360");
                }}
                className="group flex flex-col items-center justify-center gap-1.5 rounded-xl border border-cyan-400/45 bg-black/35 px-2 py-3 text-cyan-50 shadow-[0_0_28px_-12px_rgba(34,211,238,0.75)] transition hover:border-cyan-300/80 hover:bg-black/50 sm:flex-row sm:gap-2 sm:py-3.5"
              >
                <span className="relative flex h-8 w-8 shrink-0 items-center justify-center" aria-hidden>
                  <RefreshCw className="absolute h-7 w-7 text-cyan-200/90 opacity-90 transition group-hover:rotate-180 group-hover:duration-500" strokeWidth={1.75} />
                  <span className="relative z-[1] text-[10px] font-black tabular-nums text-cyan-100 drop-shadow">360</span>
                </span>
                <span className="text-center text-[11px] font-semibold leading-tight sm:text-xs">
                  360°
                </span>
              </button>
              <button
                type="button"
                title="Escena mixta (mismo que el selector)"
                onClick={() => {
                  const b = (window as Window & { AndroidBridge?: { onMtClick?: () => void } }).AndroidBridge;
                  if (typeof b?.onMtClick === "function") {
                    b.onMtClick();
                    return;
                  }
                  window.location.assign("https://onnivers.com/go/mt");
                }}
                className="group flex flex-col items-center justify-center gap-1.5 rounded-xl border border-fuchsia-400/40 bg-black/35 px-2 py-3 text-fuchsia-50 shadow-[0_0_28px_-12px_rgba(217,70,239,0.75)] transition hover:border-fuchsia-300/80 hover:bg-black/50 sm:flex-row sm:gap-2 sm:py-3.5"
              >
                <Layers2 className="h-5 w-5 shrink-0 opacity-90 transition group-hover:scale-105" aria-hidden />
                <span className="flex flex-col items-center leading-none">
                  <span className="text-xs font-semibold tracking-wide sm:text-sm">MT</span>
                  <span className="mt-0.5 text-[9px] font-normal text-fuchsia-200/70">mixto</span>
                </span>
              </button>
            </div>

            {error && <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}
          </div>

          <section className="rounded-2xl border border-fuchsia-300/30 bg-card/30 p-4 backdrop-blur-xl">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-fuchsia-100">Sugeridos</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {podcastStreamers.slice(0, 6).map((item) => {
                const suggestedChannel = buildAgoraChannel(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigate(`/sala/espectador/${encodeURIComponent(suggestedChannel)}`)}
                    className="group rounded-xl border border-fuchsia-300/25 bg-black/30 p-2 text-left transition hover:-translate-y-0.5 hover:border-fuchsia-300/60"
                  >
                    <img src={item.avatar} alt={item.name} className="mb-2 h-32 w-full rounded-lg object-cover" />
                    <p className="truncate text-sm font-semibold text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">Canal: {suggestedChannel}</p>
                  </button>
                );
              })}
            </div>
          </section>
        </section>
      </main>
    </div>
  );
};

export default EspectadorView;

