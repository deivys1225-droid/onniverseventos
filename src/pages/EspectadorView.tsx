import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import AgoraRTC, { type IAgoraRTCClient, type IAgoraRTCRemoteUser } from "agora-rtc-sdk-ng";
import { Globe2, Camera, PanelsTopLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { podcastStreamers } from "@/data/podcastStreamers";
import { buildAgoraChannel } from "@/lib/agoraRooms";
import { detectDeviceKind } from "@/lib/deviceDetection";
import { toast } from "sonner";

const APP_ID = (import.meta.env.NEXT_PUBLIC_AGORA_APP_ID as string | undefined)?.trim() ?? "";
const AUDIENCE_TOKEN =
  (import.meta.env.NEXT_PUBLIC_AGORA_AUDIENCE_TOKEN as string | undefined)?.trim() ??
  (import.meta.env.NEXT_PUBLIC_AGORA_TOKEN as string | undefined)?.trim() ??
  "";

const EspectadorView = () => {
  const navigate = useNavigate();
  const { channel } = useParams<{ channel: string }>();
  const [searchParams] = useSearchParams();
  const channelName = useMemo(() => (channel?.trim() ? decodeURIComponent(channel) : buildAgoraChannel("main")), [channel]);
  const roomTitle = (searchParams.get("title") ?? "Sala en vivo").trim();
  const inheritedToken = (searchParams.get("token") ?? "").trim();
  const fallbackMp4 = (searchParams.get("mp4") ?? "").trim();
  const forcedMode = (searchParams.get("mode") ?? "").trim().toLowerCase();
  const isMobileDevice = useMemo(() => detectDeviceKind() === "mobile", []);
  const [mobileScene, setMobileScene] = useState<"360" | "mix" | "vrdiv">("360");
  const useVodMode = (forcedMode === "vod" || (isMobileDevice && mobileScene === "mix")) && fallbackMp4.length > 0;
  const [status, setStatus] = useState("Listo para conectar");
  const [connecting, setConnecting] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const remoteUsersRef = useRef<Record<string, IAgoraRTCRemoteUser>>({});
  const remoteContainerId = "agora-audience-remote-player";

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
    if (useVodMode) return;
    void joinAudienceRoom();
  }, [joinAudienceRoom, useVodMode]);

  const openInMobileApp = (scene: "360" | "mix" | "vrdiv") => {
    const params = new URLSearchParams();
    params.set("title", roomTitle);
    params.set("mode", scene === "mix" ? "vod" : "live");
    params.set("scene", scene);
    if (inheritedToken) params.set("token", inheritedToken);
    if (fallbackMp4) params.set("mp4", fallbackMp4);

    const path = `/sala/espectador/${encodeURIComponent(channelName)}?${params.toString()}`;
    const webUrl = `https://vivevr.vercel.app${path}`;
    const deepLink = `onniverso://open?url=${encodeURIComponent(webUrl)}`;

    window.location.href = deepLink;
    window.setTimeout(() => {
      navigate(path);
    }, 1200);
  };

  const handleSceneButton = (scene: "360" | "mix" | "vrdiv") => {
    if (!isMobileDevice) {
      toast.info("Disponible en App Móvil");
      return;
    }
    openInMobileApp(scene);
    if (scene === "vrdiv") return;
    setMobileScene(scene);
    toast.success(scene === "360" ? "Modo 360° activado" : "Modo MIX activado");
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
            <div className="mt-3 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleSceneButton("360")}
                className={`inline-flex items-center justify-center gap-1 rounded-lg border px-2 py-2 text-[11px] font-semibold transition ${
                  mobileScene === "360"
                    ? "border-cyan-300/70 bg-cyan-400/15 text-cyan-100"
                    : "border-cyan-300/30 bg-black/25 text-cyan-200 hover:border-cyan-300/55"
                }`}
              >
                <Globe2 className="h-3.5 w-3.5" />
                360°
              </button>
              <button
                type="button"
                onClick={() => handleSceneButton("mix")}
                className={`inline-flex items-center justify-center gap-1 rounded-lg border px-2 py-2 text-[11px] font-semibold transition ${
                  mobileScene === "mix"
                    ? "border-fuchsia-300/70 bg-fuchsia-400/15 text-fuchsia-100"
                    : "border-fuchsia-300/30 bg-black/25 text-fuchsia-200 hover:border-fuchsia-300/55"
                }`}
              >
                <Camera className="h-3.5 w-3.5" />
                MIX
              </button>
              <button
                type="button"
                onClick={() => handleSceneButton("vrdiv")}
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-amber-300/30 bg-black/25 px-2 py-2 text-[11px] font-semibold text-amber-200 transition hover:border-amber-300/55"
              >
                <PanelsTopLeft className="h-3.5 w-3.5" />
                VR DIV
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-xs text-cyan-100">
                {roomTitle} ·{" "}
                {useVodMode ? "Reproducción automática MP4" : `Canal: ${channelName} · Estado: ${status}`}
              </p>
              <Button type="button" variant="outline" onClick={() => navigate("/nuestras-salas")}>
                Salir de la Sala
              </Button>
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

