import Navbar from "@/components/Navbar";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { createLivepeerStreamViaEdge } from "@/lib/livepeerStudio";
import { startLivepeerWhipPublisher, type WhipPublisherHandle } from "@/lib/livepeerWhip";
import { startActiveStream, stopMyActiveStream } from "@/lib/activeStreams";
import { updateProfileLiveState } from "@/lib/profile";
import { supabase } from "@/integrations/supabase/client";

function getUnknownErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "object" && error !== null) {
    const maybe = error as { message?: unknown; error?: unknown; details?: unknown };
    const msg =
      (typeof maybe.message === "string" && maybe.message.trim()) ||
      (typeof maybe.error === "string" && maybe.error.trim()) ||
      "";
    const details = typeof maybe.details === "string" && maybe.details.trim() ? ` (${maybe.details.trim()})` : "";
    if (msg) return `${msg}${details}`;
  }
  return fallback;
}

const PcScenePage = () => {
  const { user } = useAuth();
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState<"idle" | "creating_key" | "ready" | "starting" | "live">("idle");
  const [activeStreamKey, setActiveStreamKey] = useState<string | null>(null);
  const [activeWhipUrl, setActiveWhipUrl] = useState<string | null>(null);
  const [activeIngestRtmp, setActiveIngestRtmp] = useState<string | null>(null);
  const [activePlaybackId, setActivePlaybackId] = useState<string | null>(null);
  const [activePlaybackUrl, setActivePlaybackUrl] = useState<string | null>(null);
  const [liveMessage, setLiveMessage] = useState<string>("");
  const whipHandleRef = useRef<WhipPublisherHandle | null>(null);
  const localCameraStreamRef = useRef<MediaStream | null>(null);

  const createStreamWithFallback = async (title: string) => {
    try {
      return await createLivepeerStreamViaEdge(title);
    } catch (primaryError) {
      const { data, error } = await supabase.functions.invoke("livepeer-create-stream", {
        body: { title },
      });
      if (error) {
        const primaryMsg = primaryError instanceof Error ? primaryError.message : "Error desconocido (create stream).";
        const fallbackMsg = error.message || "Error desconocido (invoke).";
        throw new Error(`${primaryMsg} | Fallback invoke: ${fallbackMsg}`);
      }
      const parsed = data as
        | {
            streamKey?: string;
            playbackId?: string;
            playbackUrl?: string;
            ingestRtmp?: string;
            whipUrl?: string;
          }
        | null;
      if (
        !parsed ||
        !parsed.streamKey ||
        !parsed.playbackId ||
        !parsed.playbackUrl ||
        !parsed.ingestRtmp ||
        !parsed.whipUrl
      ) {
        throw new Error("Respuesta incompleta de livepeer-create-stream en fallback.");
      }
      return {
        streamKey: parsed.streamKey,
        playbackId: parsed.playbackId,
        playbackUrl: parsed.playbackUrl,
        ingestRtmp: parsed.ingestRtmp,
        whipUrl: parsed.whipUrl,
      };
    }
  };

  const ensureCameraReady = async () => {
    if (cameraStream) return cameraStream;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      throw new Error("Tu navegador no soporta camara.");
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30, max: 30 },
      },
      audio: false,
    });
    localCameraStreamRef.current = stream;
    setCameraStream(stream);
    setCameraError(null);
    return stream;
  };

  useEffect(
    () => () => {
      localCameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      localCameraStreamRef.current = null;
      whipHandleRef.current?.stop();
      whipHandleRef.current = null;
    },
    [],
  );

  const handlePrepareLiveKey = async () => {
    if (!user) {
      toast.error("Debes iniciar sesion para transmitir.");
      return;
    }
    if (liveStatus !== "idle") return;

    setLiveStatus("creating_key");
    setLiveMessage("Camara + API: activando en paralelo...");
    try {
      const streamTitle =
        (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
        user.email?.split("@")[0] ||
        "Live PC";
      const titleForLive = `${streamTitle} en vivo PC`;
      const [, live] = await Promise.all([ensureCameraReady(), createStreamWithFallback(titleForLive)]);
      setActiveStreamKey(live.streamKey);
      setActiveWhipUrl(live.whipUrl);
      setActiveIngestRtmp(live.ingestRtmp);
      setActivePlaybackId(live.playbackId);
      setActivePlaybackUrl(live.playbackUrl);
      setLiveStatus("ready");
      setLiveMessage("Llave lista. Pulsa TRANSMITIR.");
      toast.success("API KEY lista.");
    } catch (error) {
      whipHandleRef.current?.stop();
      whipHandleRef.current = null;
      setLiveStatus("idle");
      setLiveMessage(error instanceof Error ? error.message : "No se pudo iniciar LIVE desde PC.");
      toast.error(error instanceof Error ? error.message : "No se pudo iniciar LIVE desde PC.");
    }
  };

  const handleStartBroadcast = async () => {
    if (!user) {
      toast.error("Debes iniciar sesion para transmitir.");
      return;
    }
    const mediaForWhip = cameraStream ?? localCameraStreamRef.current;
    if (!mediaForWhip) {
      toast.error("Primero pulsa LIVE para activar la camara y generar la llave.");
      return;
    }
    if (!activeStreamKey || !activeIngestRtmp || !activePlaybackId || !activePlaybackUrl) {
      toast.error("Primero genera la llave con LIVE.");
      return;
    }
    if (!(liveStatus === "ready" || liveStatus === "idle")) return;

    setLiveStatus("starting");
    setLiveMessage("Iniciando transmision...");
    try {
      const streamTitle =
        (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
        user.email?.split("@")[0] ||
        "Live PC";

      setLiveMessage("Conectando WebRTC con Livepeer...");
      let publisher: WhipPublisherHandle;
      try {
        publisher = await startLivepeerWhipPublisher({
          mediaStream: mediaForWhip,
          streamKey: activeStreamKey,
          whipUrl: activeWhipUrl,
        });
      } catch (firstWhipError) {
        // Fallback: algunos entornos fallan con whipUrl directo; reintentar con endpoint por streamKey.
        publisher = await startLivepeerWhipPublisher({
          mediaStream: mediaForWhip,
          streamKey: activeStreamKey,
          whipUrl: null,
        }).catch((secondWhipError) => {
          const firstMsg = firstWhipError instanceof Error ? firstWhipError.message : "WHIP error";
          const secondMsg = secondWhipError instanceof Error ? secondWhipError.message : "WHIP fallback error";
          throw new Error(`WHIP fallo: ${firstMsg} | fallback: ${secondMsg}`);
        });
      }
      whipHandleRef.current = publisher;

      setLiveMessage("Sincronizando Marketplace...");
      try {
        await startActiveStream({
          userId: user.id,
          streamUrl: activeIngestRtmp,
          title: `${streamTitle} en vivo`,
          category: "Social",
          privacyMode: "publico",
          playbackUrl: activePlaybackUrl,
          playbackId: activePlaybackId,
        });
      } catch (syncError) {
        throw new Error(`Sync active_streams falló: ${getUnknownErrorMessage(syncError, "Error de sincronización")}`);
      }
      try {
        await updateProfileLiveState({
          userId: user.id,
          isLive: true,
          streamKey: activeStreamKey,
        });
      } catch (profileError) {
        throw new Error(`Sync profiles falló: ${getUnknownErrorMessage(profileError, "Error de perfil")}`);
      }

      setLiveStatus("live");
      setLiveMessage("En vivo");
      toast.success("TRANSMISION activa. Marketplace actualizado.");
    } catch (error) {
      whipHandleRef.current?.stop();
      whipHandleRef.current = null;
      setLiveStatus("ready");
      const message = getUnknownErrorMessage(error, "No se pudo iniciar transmisión.");
      setLiveMessage(message);
      toast.error(message);
      console.error("[PC LIVE] start broadcast error:", error);
    }
  };

  const handleStopBroadcast = async () => {
    if (!user) {
      toast.error("Debes iniciar sesion para terminar la transmision.");
      return;
    }
    if (liveStatus !== "live") return;

    setLiveStatus("starting");
    setLiveMessage("Terminando transmision...");
    try {
      whipHandleRef.current?.stop();
      whipHandleRef.current = null;

      await stopMyActiveStream();
      await updateProfileLiveState({
        userId: user.id,
        isLive: false,
        streamKey: null,
      });

      setLiveStatus("idle");
      setActiveStreamKey(null);
      setActiveWhipUrl(null);
      setActiveIngestRtmp(null);
      setActivePlaybackId(null);
      setActivePlaybackUrl(null);
      setLiveMessage("Transmision finalizada.");
      toast.success("Transmision finalizada.");
    } catch (error) {
      const message = getUnknownErrorMessage(error, "No se pudo terminar la transmisión.");
      setLiveStatus("live");
      setLiveMessage(message);
      toast.error(message);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      <Navbar />

      <main className="relative min-h-screen pt-16">
        <div
          className="h-[calc(100dvh-4rem)] w-full bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=2400&q=80')",
          }}
        />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4">
          <div className="pointer-events-auto relative w-full max-w-[16rem] rounded-3xl border border-white/25 bg-white/10 p-2 shadow-[0_0_60px_-18px_rgba(56,189,248,0.8)] backdrop-blur-xl">
            <div
              className={`overflow-hidden rounded-2xl border bg-black/55 ${
                liveStatus === "live"
                  ? "border-amber-300/80 shadow-[0_0_34px_-6px_rgba(250,204,21,1)]"
                  : "border-cyan-300/30"
              }`}
            >
              {cameraStream ? (
                <video
                  autoPlay
                  muted
                  playsInline
                  className="aspect-video w-full object-cover"
                  ref={(el) => {
                    if (!el) return;
                    el.srcObject = cameraStream;
                  }}
                />
              ) : (
                <div className="flex aspect-video items-center justify-center px-6 text-center text-sm text-cyan-100/90">
                  {cameraError || "Camara inactiva. Pulsa LIVE para activarla."}
                </div>
              )}
            </div>
            {liveMessage && (
              <div
                className={`mt-2 rounded-xl px-3 py-1.5 text-center text-[11px] font-semibold uppercase tracking-[0.14em] ${
                  liveStatus === "live"
                    ? "border border-amber-300/60 bg-amber-300/15 text-amber-100"
                    : liveStatus === "starting"
                    ? "border border-cyan-300/50 bg-cyan-500/12 text-cyan-100"
                    : "border border-rose-300/50 bg-rose-500/12 text-rose-100"
                }`}
              >
                {liveMessage}
              </div>
            )}
            <div className="absolute -right-[6.9rem] top-[32%] flex -translate-y-1/2 flex-col gap-2">
              <button
                type="button"
                disabled={liveStatus !== "idle"}
                onClick={() => void handlePrepareLiveKey()}
                className="rounded-full border border-rose-300/80 bg-rose-500/30 px-4 py-2 font-display text-[11px] font-extrabold uppercase tracking-[0.2em] text-red-200 [text-shadow:0_0_14px_rgba(255,0,38,1)] shadow-[0_0_34px_-6px_rgba(255,0,64,1)] transition hover:bg-rose-500/45 hover:shadow-[0_0_42px_-5px_rgba(255,0,64,1)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {liveStatus === "creating_key" ? "Creando..." : liveStatus === "ready" ? "Key OK" : liveStatus === "live" ? "Live ON" : "Live"}
              </button>
              <button
                type="button"
                disabled={!(liveStatus === "ready" || liveStatus === "live")}
                onClick={() => void (liveStatus === "live" ? handleStopBroadcast() : handleStartBroadcast())}
                className="rounded-full border border-rose-300/80 bg-rose-500/30 px-4 py-2 font-display text-[11px] font-extrabold uppercase tracking-[0.2em] text-red-200 [text-shadow:0_0_14px_rgba(255,0,38,1)] shadow-[0_0_34px_-6px_rgba(255,0,64,1)] transition hover:bg-rose-500/45 hover:shadow-[0_0_42px_-5px_rgba(255,0,64,1)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {liveStatus === "starting" ? "Procesando..." : liveStatus === "live" ? "Terminar" : "Transmitir"}
              </button>
            </div>
            {liveStatus === "live" && activeStreamKey && (
              <div className="mt-1 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                Flujo web activo
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default PcScenePage;
