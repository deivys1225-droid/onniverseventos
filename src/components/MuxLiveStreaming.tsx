import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { MuxObsEmitterPanel, type MuxObsStreamCredentials } from "@/components/streaming/MuxObsEmitterPanel";
import { MuxLiveStatusCard } from "@/components/streaming/MuxLiveStatusCard";
import { createMuxStream } from "@/lib/muxStream";
import { MUX_SIGNAL_POLL_MS, resolveMuxStreamSignalState } from "@/lib/muxStreamPolling";
import type { MuxStreamSignalState } from "@/lib/muxStreamStatus";
import { updateProfileLiveState } from "@/lib/profile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type StreamConfig = {
  title: string;
  rawChannelName: string;
  muxLiveStreamId: string;
  streamKey: string;
  playbackId: string;
  playbackUrl: string;
  rtmpUrl: string;
  rtmpServer: string;
  ticketPrice: number;
  isFree: boolean;
};

type EventSetup = {
  title: string;
  rawChannelName: string;
  ticketPrice: number;
  isFree: boolean;
};

export type MuxLiveStreamingProps = {
  variant?: "default" | "conciertos-live";
  /** Evento precargado (Conciertos Live: título y canal desde la tarjeta). */
  initialEventSetup?: EventSetup | null;
  streamCategory?: string;
};

const MuxLiveStreaming = ({
  variant = "default",
  initialEventSetup = null,
  streamCategory,
}: MuxLiveStreamingProps) => {
  const isConciertosLive = variant === "conciertos-live";
  const activeCategory = streamCategory ?? (isConciertosLive ? "ConciertosLive" : "Musica");
  const { user } = useAuth();
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState("Pulsa Live para obtener credenciales OBS");
  const [error, setError] = useState<string | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isEmitterOpen, setIsEmitterOpen] = useState(false);
  const [ticketInput, setTicketInput] = useState("0");
  const [isFreeEvent, setIsFreeEvent] = useState(true);
  const [eventSetup, setEventSetup] = useState<EventSetup | null>(initialEventSetup);
  const [streamConfig, setStreamConfig] = useState<StreamConfig | null>(null);
  const [signalLive, setSignalLive] = useState(false);
  const [muxSignal, setMuxSignal] = useState<MuxStreamSignalState>("idle");
  const signalLiveRef = useRef(signalLive);

  useEffect(() => {
    signalLiveRef.current = signalLive;
  }, [signalLive]);

  const canOpenSetup = Boolean(user?.id) && !connecting;

  const persistLiveState = useCallback(
    async (config: StreamConfig, isLive: boolean) => {
      if (!user?.id) return;

      const privacyMode = config.isFree ? "publico" : "privado_ticket";
      const ticketPrice = config.isFree ? null : Number(config.ticketPrice.toFixed(2));

      const { error: streamErr } = await supabase.from("active_streams").upsert(
        {
          user_id: user.id,
          title: config.title,
          category: activeCategory,
          is_live: isLive,
          stream_url: config.rtmpUrl,
          playback_url: config.playbackUrl,
          playback_id: config.playbackId,
          privacy_mode: privacyMode,
          ticket_price: ticketPrice,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      if (streamErr) throw streamErr;

      await updateProfileLiveState({
        userId: user.id,
        isLive,
        streamKey: isLive ? config.streamKey : null,
        playbackId: isLive ? config.playbackId : null,
      });

      const { error: profileErr } = await supabase
        .from("profiles")
        .update({
          live_status: isLive ? "En Línea" : "Offline",
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
      if (profileErr) throw profileErr;
    },
    [activeCategory, user?.id],
  );

  const stopLive = useCallback(async () => {
    if (!user?.id) return;

    setStreamConfig(null);
    setSignalLive(false);
    setIsEmitterOpen(false);

    const { error: rpcErr } = await supabase.rpc("stop_my_active_streams");
    if (rpcErr) {
      await supabase
        .from("active_streams")
        .update({ is_live: false, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
      await supabase
        .from("profiles")
        .update({ live_status: "Offline", updated_at: new Date().toISOString() })
        .eq("id", user.id);
    }

    setStatus(eventSetup ? "Sesión cerrada · pulsa Live de nuevo" : "Transmisión detenida");
    toast.info("Sesión Live cerrada.");
  }, [eventSetup, user?.id]);

  const ensureMuxStream = useCallback(async (): Promise<StreamConfig> => {
    if (streamConfig) return streamConfig;
    if (!user?.id || !eventSetup) {
      throw new Error("Configura el evento antes de ir en vivo.");
    }

    setConnecting(true);
    setStatus("Creando live stream en Mux…");

    const mux = await createMuxStream(`Transmision_Onniverso_${eventSetup.rawChannelName}`);

    const config: StreamConfig = {
      title: eventSetup.title,
      rawChannelName: eventSetup.rawChannelName,
      muxLiveStreamId: mux.liveStreamId,
      streamKey: mux.streamKey,
      playbackId: mux.playbackId,
      playbackUrl: mux.playbackUrl,
      rtmpUrl: mux.rtmpPushUrl || mux.ingestUrl,
      rtmpServer: mux.rtmpIngestUrl,
      ticketPrice: eventSetup.ticketPrice,
      isFree: eventSetup.isFree,
    };

    await persistLiveState(config, false);
    setStreamConfig(config);
    setSignalLive(false);
    setStatus("Esperando señal RTMP desde OBS");
    toast.success("Live Mux creado. Copia la URL RTMP en OBS.");
    return config;
  }, [eventSetup, persistLiveState, streamConfig, user?.id]);

  const handleOpenLive = useCallback(async () => {
    if (!user?.id) {
      setError("Debes iniciar sesión.");
      return;
    }
    if (!eventSetup) {
      setIsConfigOpen(true);
      return;
    }

    try {
      setError(null);
      await ensureMuxStream();
      setIsEmitterOpen(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo crear el live en Mux.";
      setError(msg);
      setStatus("Error al crear live");
    } finally {
      setConnecting(false);
    }
  }, [ensureMuxStream, eventSetup, user?.id]);

  const handleSignalActive = useCallback(async () => {
    if (!streamConfig || signalLiveRef.current) return;
    try {
      await persistLiveState(streamConfig, true);
      setSignalLive(true);
      setStatus("En vivo · señal Mux activa");
      toast.success("¡Señal detectada! La sala ya está disponible.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo publicar el estado en vivo.";
      toast.error(msg);
    }
  }, [persistLiveState, streamConfig]);

  useEffect(() => {
    if (!streamConfig) {
      setMuxSignal("idle");
      return;
    }

    let cancelled = false;

    const poll = async () => {
      const next = await resolveMuxStreamSignalState({
        liveStreamId: streamConfig.muxLiveStreamId,
        playbackId: streamConfig.playbackId,
      });
      if (cancelled) return;

      setMuxSignal(next);
      if (next === "active") {
        void handleSignalActive();
      }
    };

    setMuxSignal("checking");
    void poll();
    const timer = window.setInterval(() => void poll(), MUX_SIGNAL_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [streamConfig, handleSignalActive]);

  useEffect(() => {
    if (initialEventSetup) {
      setEventSetup(initialEventSetup);
      setStatus("Evento Conciertos Live listo · pulsa Live");
    }
  }, [initialEventSetup]);

  const openEventSetup = () => {
    if (!user?.id) {
      setError("Debes iniciar sesión.");
      return;
    }
    if (isConciertosLive && initialEventSetup) {
      toast.info("El evento ya está vinculado a tu tarjeta de Conciertos Live.");
      return;
    }
    setError(null);
    setIsConfigOpen(true);
  };

  const saveEventSetup = () => {
    if (!user?.id) return;
    const profileName =
      (user.user_metadata?.full_name as string | undefined)?.trim() ||
      (user.user_metadata?.name as string | undefined)?.trim() ||
      (user.email?.split("@")[0] ?? "").trim() ||
      "creador";
    const parsed = Number(ticketInput);
    const normalizedPrice = Number.isFinite(parsed) && parsed >= 0 ? Number(parsed.toFixed(2)) : 0;
    const isFree = isFreeEvent || normalizedPrice <= 0;

    setEventSetup({
      title: `Canal ${profileName}`,
      rawChannelName: profileName,
      ticketPrice: isFree ? 0 : normalizedPrice,
      isFree,
    });
    setStreamConfig(null);
    setSignalLive(false);
    setStatus("Evento listo · pulsa Live");
    setIsConfigOpen(false);
    toast.success("Evento configurado. Pulsa Live para credenciales OBS.");
  };

  const obsCredentials: MuxObsStreamCredentials | null = streamConfig
    ? {
        title: streamConfig.title,
        rawChannelName: streamConfig.rawChannelName,
        liveStreamId: streamConfig.muxLiveStreamId,
        streamKey: streamConfig.streamKey,
        playbackId: streamConfig.playbackId,
        playbackUrl: streamConfig.playbackUrl,
        rtmpUrl: streamConfig.rtmpUrl,
        rtmpServer: streamConfig.rtmpServer,
      }
    : null;

  return (
    <section className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-3xl border border-cyan-300/30 bg-card/35 p-4 shadow-[0_0_60px_-18px_rgba(34,211,238,0.9)] backdrop-blur-xl md:p-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,hsl(var(--primary)/0.22),transparent_45%),radial-gradient(circle_at_85%_90%,hsl(290_80%_60%/0.15),transparent_45%)]" />
      </div>

      <div className="relative z-10 mb-4 text-center md:mb-5">
        <h2 className="font-display text-xl font-bold tracking-tight text-foreground md:text-2xl">
          {isConciertosLive ? (
            <>
              Emitir <span className="text-gradient-neon">Conciertos Live</span>
            </>
          ) : (
            <>
              Evento <span className="text-gradient-neon">Live</span> en Al Universo
            </>
          )}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {isConciertosLive
            ? "OBS → Mux · Tu tarjeta en Conciertos Live mostrará el HLS al detectar señal."
            : "Emisión RTMP con OBS → Mux · Espectadores vía playback_id"}
        </p>
      </div>

      <div className="relative z-10 mb-3 flex justify-center">
        <p className="rounded-full border border-cyan-300/35 bg-cyan-400/10 px-4 py-1 text-xs text-cyan-100">
          Estado: {status}
        </p>
      </div>

      {error && (
        <p className="relative z-10 mb-4 whitespace-pre-wrap rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center gap-4">
        {streamConfig ? (
          <MuxLiveStatusCard
            className="w-full"
            signal={muxSignal}
            playbackUrl={streamConfig.playbackUrl}
            playbackId={streamConfig.playbackId}
          />
        ) : null}

        <div className="flex w-full flex-col items-center justify-center gap-4 rounded-2xl border border-cyan-300/35 bg-black/50 p-8 text-center">
          {!eventSetup ? (
            <p className="text-sm text-muted-foreground">Configura tu evento y luego pulsa Live para obtener credenciales OBS.</p>
          ) : (
            <>
              <p className="text-sm font-medium text-cyan-100">{eventSetup.title}</p>
              <p className="max-w-md text-xs text-muted-foreground">
                No se usa cámara del navegador. Transmite desde OBS con la URL RTMP que te entregamos al pulsar Live.
              </p>
            </>
          )}
          <div className="flex flex-wrap justify-center gap-2">
            <Button type="button" variant="hero" onClick={() => void handleOpenLive()} disabled={connecting || !user?.id}>
              {connecting ? "Creando en Mux…" : "Live"}
            </Button>
            {!isConciertosLive && (
              <Button type="button" variant="outline" onClick={openEventSetup} disabled={!canOpenSetup}>
                {eventSetup ? "Reconfigurar evento" : "Configurar evento"}
              </Button>
            )}
            {streamConfig && (
              <Button type="button" variant="outline" onClick={() => void stopLive()}>
                Cerrar sesión
              </Button>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="border-cyan-300/40 bg-card/95 backdrop-blur-md sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Configurar evento Mux</DialogTitle>
            <DialogDescription>
              Al pulsar Live se crea el stream en Mux y obtienes stream_key, URL RTMP y playback_id para OBS.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={ticketInput}
              onChange={(e) => {
                const next = e.target.value;
                setTicketInput(next);
                const asNum = Number(next);
                setIsFreeEvent(!(Number.isFinite(asNum) && asNum > 0));
              }}
              placeholder="Precio de entrada (USD)"
              className="border-cyan-300/35 bg-black/25"
            />
            <label className="flex items-center gap-2 text-sm text-cyan-100">
              <Checkbox
                checked={isFreeEvent}
                onCheckedChange={(checked) => {
                  const next = checked === true;
                  setIsFreeEvent(next);
                  if (next) setTicketInput("0");
                }}
              />
              Evento gratuito
            </label>
            <Button type="button" className="w-full" onClick={saveEventSetup}>
              Guardar evento
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEmitterOpen} onOpenChange={setIsEmitterOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-cyan-300/40 bg-card/95 backdrop-blur-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Panel de emisión OBS</DialogTitle>
            <DialogDescription>
              Copia estos datos en OBS. El indicador pasará a En vivo cuando Mux detecte señal RTMP.
            </DialogDescription>
          </DialogHeader>
          {obsCredentials ? (
            <MuxObsEmitterPanel
              credentials={obsCredentials}
              signal={muxSignal}
              onEndSession={() => void stopLive()}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Creando credenciales…</p>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default MuxLiveStreaming;
