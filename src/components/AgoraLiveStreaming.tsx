import { Capacitor } from "@capacitor/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { LivepeerBroadcastPanel } from "@/components/streaming/LivepeerBroadcastPanel";
import { createLivepeerStream, pollLivepeerStreamStatus } from "@/lib/livepeerStream";
import { updateProfileLiveState } from "@/lib/profile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type StreamConfig = {
  title: string;
  rawChannelName: string;
  livepeerStreamId: string;
  streamKey: string;
  playbackId: string;
  playbackUrl: string;
  rtmpIngestUrl: string;
  rtmpPushUrl: string;
  ingestUrl: string;
  ticketPrice: number;
  isFree: boolean;
};

const AgoraLiveStreaming = () => {
  const { user } = useAuth();
  const [broadcasting, setBroadcasting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState("Genera tu canal para transmitir");
  const [error, setError] = useState<string | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [ticketInput, setTicketInput] = useState("0");
  const [isFreeEvent, setIsFreeEvent] = useState(true);
  const [streamConfig, setStreamConfig] = useState<StreamConfig | null>(null);

  const canGenerate = useMemo(() => Boolean(user?.id) && !broadcasting && !connecting, [user?.id, broadcasting, connecting]);

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
          livepeer_stream_id: config.livepeerStreamId,
          stream_url: config.rtmpPushUrl,
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
    setBroadcasting(false);
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
    setStatus(streamConfig ? "Canal listo · pulsa Iniciar transmisión" : "Transmisión detenida");
    toast.info("Transmisión detenida.");
  }, [streamConfig, user?.id]);

  const handleLive = useCallback(async () => {
    if (!streamConfig || !user?.id) return;
    try {
      await persistLiveState(streamConfig, true);
      setBroadcasting(true);
      setStatus("Transmitiendo en vivo por WebRTC (Livepeer)");
      toast.success("¡En vivo! Los espectadores ya pueden ver tu transmisión.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo publicar el estado en vivo.";
      setError(msg);
    }
  }, [persistLiveState, streamConfig, user?.id]);

  const handleStopped = useCallback(() => {
    if (!broadcasting) return;
    void stopLive();
  }, [broadcasting, stopLive]);

  useEffect(() => {
    return () => {
      if (!user?.id || !broadcasting) return;
      void supabase.rpc("stop_my_active_streams");
    };
  }, [broadcasting, user?.id]);

  const rtmpPollBusyRef = useRef(false);

  /** Móvil/APK: detecta cuando Larix/OBS conecta RTMP a Livepeer y marca is_live. */
  useEffect(() => {
    if (!streamConfig?.livepeerStreamId || !user?.id || broadcasting) return;
    if (!Capacitor.isNativePlatform()) return;

    let cancelled = false;
    const tick = async () => {
      if (cancelled || rtmpPollBusyRef.current) return;
      rtmpPollBusyRef.current = true;
      try {
        const status = await pollLivepeerStreamStatus({
          livepeerStreamId: streamConfig.livepeerStreamId,
          userId: user.id,
        });
        if (cancelled) return;
        if (status.isActive && status.synced) {
          setBroadcasting(true);
          setStatus("En vivo · señal RTMP conectada a Livepeer");
          toast.success("Transmisión RTMP activa. Los espectadores ya pueden ver tu live.");
        }
      } catch {
        /* sigue en espera de RTMP */
      } finally {
        rtmpPollBusyRef.current = false;
      }
    };

    void tick();
    const interval = window.setInterval(() => void tick(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [broadcasting, streamConfig?.livepeerStreamId, user?.id]);

  const handleGenerateChannel = () => {
    if (!user?.id) {
      setError("Debes iniciar sesión para generar tu canal.");
      return;
    }
    setError(null);
    setIsConfigOpen(true);
  };

  const saveConfig = async () => {
    if (!user?.id) return;
    const profileName =
      (user.user_metadata?.full_name as string | undefined)?.trim() ||
      (user.user_metadata?.name as string | undefined)?.trim() ||
      (user.email?.split("@")[0] ?? "").trim() ||
      "creador";
    const requestedChannelName = profileName;
    const parsed = Number(ticketInput);
    const normalizedPrice = Number.isFinite(parsed) && parsed >= 0 ? Number(parsed.toFixed(2)) : 0;
    const isFree = isFreeEvent || normalizedPrice <= 0;

    try {
      setError(null);
      setConnecting(true);
      setStatus("Creando stream en Livepeer Studio...");

      const livepeer = await createLivepeerStream(`Transmision_Onniverso_${requestedChannelName}`);

      const config: StreamConfig = {
        title: `Canal ${requestedChannelName}`,
        rawChannelName: requestedChannelName,
        livepeerStreamId: livepeer.livepeerStreamId,
        streamKey: livepeer.streamKey,
        playbackId: livepeer.playbackId,
        playbackUrl: livepeer.playbackUrl,
        rtmpIngestUrl: livepeer.rtmpIngestUrl,
        rtmpPushUrl: livepeer.rtmpPushUrl,
        ingestUrl: livepeer.rtmpPushUrl,
        ticketPrice: isFree ? 0 : normalizedPrice,
        isFree,
      };

      await persistLiveState(config, false);

      setStreamConfig(config);
      setStatus(
        Capacitor.isNativePlatform()
          ? "Canal listo · envía RTMP desde el celular (Larix/OBS)"
          : "Canal listo · pulsa Iniciar transmisión o usa RTMP",
      );
      setIsConfigOpen(false);
      toast.success("Canal Livepeer creado. Usa cámara y micrófono desde el navegador.");
    } catch (e) {
      const message = e instanceof Error ? e.message : `No se pudo generar el canal (${JSON.stringify(e)})`;
      setError(message);
      setStatus("Error al generar canal");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <section className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-3xl border border-cyan-300/30 bg-card/35 p-4 shadow-[0_0_60px_-18px_rgba(34,211,238,0.9)] backdrop-blur-xl md:p-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,hsl(var(--primary)/0.22),transparent_45%),radial-gradient(circle_at_85%_90%,hsl(290_80%_60%/0.15),transparent_45%)]" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
            backgroundSize: "52px 52px",
          }}
        />
      </div>

      <div className="relative z-10 mb-4 text-center md:mb-5">
        <h2 className="font-display text-xl font-bold tracking-tight text-foreground md:text-2xl">
          Evento <span className="text-gradient-neon">Live</span> en Al Universo
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Transmisión web con Livepeer (cámara + micrófono)</p>
      </div>

      <div className="relative z-10 mb-3 flex justify-center">
        <p className="rounded-full border border-cyan-300/35 bg-cyan-400/10 px-4 py-1 text-xs text-cyan-100">
          Estado: {status}
        </p>
      </div>
      {error && (
        <p className="relative z-10 mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="relative z-10 mx-auto w-full max-w-3xl space-y-4">
        {!streamConfig ? (
          <div className="flex aspect-video w-full items-center justify-center rounded-2xl border border-dashed border-cyan-300/35 bg-black/40 p-6 text-center text-sm text-muted-foreground">
            Genera un canal para activar el emisor Livepeer en tu navegador.
          </div>
        ) : (
          <LivepeerBroadcastPanel
            key={streamConfig.streamKey}
            streamKey={streamConfig.streamKey}
            title={streamConfig.title}
            onLive={() => void handleLive()}
            onStopped={handleStopped}
            onError={(message) => setError(message)}
          />
        )}

        <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Button
            type="button"
            variant="hero"
            onClick={handleGenerateChannel}
            disabled={!canGenerate}
            className="min-h-12 min-w-[220px] px-8 text-sm font-bold uppercase tracking-wide"
          >
            {streamConfig ? "Nuevo canal" : "Generar canal"}
          </Button>
          {broadcasting && (
            <Button type="button" variant="outline" onClick={() => void stopLive()}>
              Cerrar señal en la plataforma
            </Button>
          )}
        </div>

        {streamConfig && (
          <div className="space-y-1 text-center text-xs text-cyan-100/90">
            <p>
              {streamConfig.title} · {streamConfig.isFree ? "Gratuito" : `Ticket: $${streamConfig.ticketPrice.toFixed(2)} USD`}
            </p>
            <p className="break-all font-mono text-[10px] text-violet-200/80">HLS: {streamConfig.playbackUrl}</p>
            <p className="break-all font-mono text-[10px] text-cyan-200/90">
              RTMP (celular): {streamConfig.rtmpPushUrl}
            </p>
            <p className="text-[10px] text-muted-foreground">
              En móvil usa Larix u OBS con esa URL; la web pasará a en vivo al detectar la señal.
            </p>
          </div>
        )}
      </div>

      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="border-cyan-300/40 bg-card/95 backdrop-blur-md sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Generar canal Livepeer</DialogTitle>
            <DialogDescription>
              Crea el stream en Livepeer Studio. Luego transmite con tu cámara y micrófono desde esta página.
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
            <Button type="button" className="w-full" onClick={() => void saveConfig()} disabled={connecting}>
              {connecting ? "Creando stream…" : "Guardar y generar canal"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default AgoraLiveStreaming;
