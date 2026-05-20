import { useCallback, useEffect, useState } from "react";
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
import { MuxBroadcast } from "@/components/streaming/MuxBroadcast";
import { createMuxStream } from "@/lib/muxStream";
import { releaseLocalMediaCapture } from "@/lib/mediaStreamCleanup";
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
  rtmpIngestUrl: string;
  ingestUrl: string;
  ticketPrice: number;
  isFree: boolean;
};

type EventSetup = {
  title: string;
  rawChannelName: string;
  ticketPrice: number;
  isFree: boolean;
};

const MuxLiveStreaming = () => {
  const { user } = useAuth();
  const [broadcasting, setBroadcasting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState("Configura tu evento y pulsa Iniciar transmisión");
  const [error, setError] = useState<string | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [ticketInput, setTicketInput] = useState("0");
  const [isFreeEvent, setIsFreeEvent] = useState(true);
  const [eventSetup, setEventSetup] = useState<EventSetup | null>(null);
  const [streamConfig, setStreamConfig] = useState<StreamConfig | null>(null);
  const [panelKey, setPanelKey] = useState(0);

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
          category: "Musica",
          is_live: isLive,
          stream_url: config.ingestUrl,
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
    [user?.id],
  );

  const stopLive = useCallback(async () => {
    if (!user?.id) return;
    releaseLocalMediaCapture();
    setPanelKey((k) => k + 1);
    setBroadcasting(false);
    setStreamConfig(null);

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

    setStatus(eventSetup ? "Evento listo · pulsa Iniciar transmisión de nuevo" : "Transmisión detenida");
    toast.info("Transmisión detenida.");
  }, [eventSetup, user?.id]);

  /** Iniciar transmisión: backend Mux crea el live + activamos tarjeta en vivo. */
  const handleStartTransmission = useCallback(async () => {
    if (!user?.id || !eventSetup) {
      setError("Primero configura el evento (Generar canal).");
      return;
    }

    try {
      setError(null);
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
        rtmpIngestUrl: mux.rtmpIngestUrl,
        ingestUrl: mux.ingestUrl,
        ticketPrice: eventSetup.ticketPrice,
        isFree: eventSetup.isFree,
      };

      await persistLiveState(config, true);

      setStreamConfig(config);
      setBroadcasting(true);
      setStatus("En vivo · publicando cámara del navegador a Mux");
      toast.success("Live Mux creado. Enviando señal desde el navegador…");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo crear el live en Mux.";
      setError(msg);
      setStatus("Error al iniciar transmisión");
    } finally {
      setConnecting(false);
    }
  }, [eventSetup, persistLiveState, user?.id]);

  const handleStopTransmission = useCallback(() => {
    if (!broadcasting) return;
    void stopLive();
  }, [broadcasting, stopLive]);

  useEffect(() => {
    return () => {
      if (!user?.id || !broadcasting) return;
      void supabase.rpc("stop_my_active_streams");
    };
  }, [broadcasting, user?.id]);

  const openEventSetup = () => {
    if (!user?.id) {
      setError("Debes iniciar sesión.");
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
    setBroadcasting(false);
    setStatus("Evento listo · pulsa Iniciar transmisión (crea el live en Mux)");
    setIsConfigOpen(false);
    toast.success("Evento configurado. Pulsa Iniciar transmisión cuando estés listo.");
  };

  return (
    <section className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-3xl border border-cyan-300/30 bg-card/35 p-4 shadow-[0_0_60px_-18px_rgba(34,211,238,0.9)] backdrop-blur-xl md:p-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,hsl(var(--primary)/0.22),transparent_45%),radial-gradient(circle_at_85%_90%,hsl(290_80%_60%/0.15),transparent_45%)]" />
      </div>

      <div className="relative z-10 mb-4 text-center md:mb-5">
        <h2 className="font-display text-xl font-bold tracking-tight text-foreground md:text-2xl">
          Evento <span className="text-gradient-neon">Live</span> en Al Universo
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Transmisión Mux (navegador → RTMP + HLS)</p>
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

      <div className="relative z-10 mx-auto w-full max-w-3xl space-y-4">
        {!eventSetup ? (
          <div className="flex aspect-video w-full items-center justify-center rounded-2xl border border-dashed border-cyan-300/35 bg-black/40 p-6 text-center text-sm text-muted-foreground">
            Pulsa Generar canal para configurar tu evento en vivo con Mux.
          </div>
        ) : streamConfig ? (
          <MuxBroadcast
            key={`${streamConfig.streamKey}-${panelKey}`}
            title={streamConfig.title}
            playbackId={streamConfig.playbackId}
            streamKey={streamConfig.streamKey}
            rtmpPushUrl={streamConfig.ingestUrl}
            playbackUrl={streamConfig.playbackUrl}
            broadcasting={broadcasting}
            connecting={connecting}
            onStopTransmission={handleStopTransmission}
          />
        ) : (
          <div className="flex aspect-video w-full flex-col items-center justify-center gap-4 rounded-2xl border border-cyan-300/35 bg-black/50 p-6">
            <p className="text-center text-sm text-cyan-100">{eventSetup.title}</p>
            <Button
              type="button"
              variant="hero"
              disabled={connecting}
              className="min-h-12 min-w-[220px] px-8 font-bold uppercase"
              onClick={() => void handleStartTransmission()}
            >
              {connecting ? "Creando en Mux…" : "Iniciar transmisión"}
            </Button>
          </div>
        )}

        <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Button type="button" variant="hero" onClick={openEventSetup} disabled={!canOpenSetup}>
            {eventSetup ? "Reconfigurar evento" : "Generar canal"}
          </Button>
          {broadcasting && (
            <Button type="button" variant="outline" onClick={() => void stopLive()}>
              Cerrar señal en la plataforma
            </Button>
          )}
        </div>

        {streamConfig && (
          <div className="space-y-1 text-center text-xs text-cyan-100/90">
            <p className="break-all font-mono text-[10px] text-violet-200/80">playback_id: {streamConfig.playbackId}</p>
            <p className="break-all font-mono text-[10px] text-violet-200/80">stream_key: {streamConfig.streamKey}</p>
          </div>
        )}
      </div>

      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="border-cyan-300/40 bg-card/95 backdrop-blur-md sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Configurar evento Mux</DialogTitle>
            <DialogDescription>
              Al iniciar transmisión se crea el live en Mux y obtienes stream_key + playback_id.
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
    </section>
  );
};

export default MuxLiveStreaming;
