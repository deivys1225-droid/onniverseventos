import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AgoraRTC, {
  type IAgoraRTCClient,
  type IAgoraRTCRemoteUser,
  type ICameraVideoTrack,
  type IMicrophoneAudioTrack,
} from "agora-rtc-sdk-ng";
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
import { createLivepeerStream } from "@/lib/livepeerStream";
import { updateProfileLiveState } from "@/lib/profile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type StreamConfig = {
  title: string;
  rawChannelName: string;
  streamKey: string;
  playbackId: string;
  playbackUrl: string;
  rtmpIngestUrl: string;
  ingestUrl: string;
  ticketPrice: number;
  isFree: boolean;
};

const AgoraLiveStreaming = () => {
  const { user } = useAuth();
  const [joined, setJoined] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState("Esperando configuración");
  const [error, setError] = useState<string | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [ticketInput, setTicketInput] = useState("0");
  const [isFreeEvent, setIsFreeEvent] = useState(true);
  const [streamConfig, setStreamConfig] = useState<StreamConfig | null>(null);

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localVideoTrackRef = useRef<ICameraVideoTrack | null>(null);
  const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const remoteUsersRef = useRef<Record<string, IAgoraRTCRemoteUser>>({});

  const localContainerId = "agora-local-player";
  const remoteContainerId = "agora-remote-player";

  const canGenerate = useMemo(() => Boolean(user?.id) && !joined && !connecting, [user?.id, joined, connecting]);
  const canGoLive = useMemo(
    () => Boolean(streamConfig?.streamKey) && Boolean(streamConfig) && !joined && !connecting,
    [streamConfig, joined, connecting],
  );

  const createClient = useCallback(() => {
    const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
    client.setClientRole("host");
    return client;
  }, []);

  const leave = useCallback(async () => {
    try {
      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.stop();
        localVideoTrackRef.current.close();
        localVideoTrackRef.current = null;
      }
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.stop();
        localAudioTrackRef.current.close();
        localAudioTrackRef.current = null;
      }

      const client = clientRef.current;
      if (client) {
        await client.leave();
      }
      clientRef.current = null;
      remoteUsersRef.current = {};
    } finally {
      setJoined(false);
      setConnecting(false);
      setStatus(streamConfig ? "Canal listo para emitir" : "Desconectado");
    }
  }, [streamConfig]);

  const mountFirstRemoteUser = useCallback(() => {
    const users = Object.values(remoteUsersRef.current);
    const first = users.find((u) => u.videoTrack);
    const remoteContainer = document.getElementById(remoteContainerId);
    if (!remoteContainer) return;

    if (!first?.videoTrack) {
      remoteContainer.innerHTML =
        '<p class="text-sm text-muted-foreground">Esperando transmisión del broadcaster...</p>';
      return;
    }
    remoteContainer.innerHTML = "";
    first.videoTrack.play(remoteContainer);
  }, []);

  const join = useCallback(async () => {
    if (!user?.id) {
      setError("Debes iniciar sesión para emitir.");
      return;
    }
    if (!streamConfig) {
      setError("Primero genera el canal del evento.");
      return;
    }
    if (!streamConfig.streamKey) {
      setError("Primero genera el canal Livepeer (stream key).");
      return;
    }

    setError(null);
    setConnecting(true);

    try {
      if (typeof navigator !== "undefined" && !navigator.mediaDevices?.getUserMedia) {
        throw new Error("Este navegador no soporta getUserMedia.");
      }
      if (typeof window !== "undefined" && !window.isSecureContext) {
        throw new Error("La cámara requiere contexto seguro (HTTPS o localhost).");
      }

      setStatus("Permisos de cámara y micrófono…");
      const [microphoneTrack, cameraTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
      localAudioTrackRef.current = microphoneTrack;
      localVideoTrackRef.current = cameraTrack;
      cameraTrack.play(localContainerId);
      microphoneTrack.play();

      setStatus(
        "Vista previa local activa. Emite con OBS/RTMP usando tu Stream Key de Livepeer.",
      );

      const privacyMode = streamConfig.isFree ? "publico" : "privado_ticket";
      const ticketPrice = streamConfig.isFree ? null : Number(streamConfig.ticketPrice.toFixed(2));
      const { error: streamErr } = await supabase.from("active_streams").upsert(
        {
          user_id: user.id,
          title: streamConfig.title,
          category: "Musica",
          is_live: true,
          stream_url: streamConfig.ingestUrl,
          playback_url: streamConfig.playbackUrl,
          playback_id: streamConfig.playbackId,
          privacy_mode: privacyMode,
          ticket_price: ticketPrice,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      if (streamErr) throw streamErr;

      await updateProfileLiveState({
        userId: user.id,
        isLive: true,
        streamKey: streamConfig.streamKey,
        playbackId: streamConfig.playbackId,
      });

      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ live_status: "En Línea", updated_at: new Date().toISOString() })
        .eq("id", user.id);
      if (profileErr) throw profileErr;

      setJoined(true);
      setConnecting(false);
      toast.success("Live iniciado. Emite con OBS/RTMP usando tu Stream Key.");
    } catch (e) {
      await leave();
      const rawMessage = e instanceof Error ? e.message : "No se pudo iniciar la vista previa.";
      const normalizedMessage = rawMessage.toUpperCase();
      if (
        normalizedMessage.includes("PERMISSION_DENIED") ||
        normalizedMessage.includes("NOTALLOWEDERROR")
      ) {
        setError(
          "Sin permiso de cámara o micrófono. En Android: Ajustes → Apps → tu app → Permisos → permite Cámara y Micrófono. Luego pulsa de nuevo «Emitir Live».",
        );
        setConnecting(false);
        setStatus("Permisos necesarios");
        return;
      }
      setError(rawMessage);
      setConnecting(false);
      setStatus("Error de conexión");
    }
  }, [createClient, leave, mountFirstRemoteUser, streamConfig, user?.id]);

  const stopLive = useCallback(async () => {
    if (!user?.id) return;
    await leave();
    const { error: rpcErr } = await supabase.rpc("stop_my_active_streams");
    if (rpcErr) {
      const { error: streamErr } = await supabase
        .from("active_streams")
        .update({ is_live: false, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
      if (streamErr) {
        toast.error("No se pudo cerrar la señal de Live en el backend.");
      }
      await supabase
        .from("profiles")
        .update({ live_status: "Offline", updated_at: new Date().toISOString() })
        .eq("id", user.id);
    }
    setStatus(streamConfig ? "Canal listo para emitir" : "Live detenido");
    toast.info("Transmisión detenida.");
  }, [leave, streamConfig, user?.id]);

  useEffect(() => {
    return () => {
      if (!user?.id) return;
      if (!joined) return;
      void supabase.rpc("stop_my_active_streams");
    };
  }, [joined, user?.id]);

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

      const resolvedTitle = `Canal ${requestedChannelName}`;
      const privacyMode = isFree ? "publico" : "privado_ticket";
      const ticketPrice = isFree ? null : Number(normalizedPrice.toFixed(2));

      const { error: streamErr } = await supabase.from("active_streams").upsert(
        {
          user_id: user.id,
          title: resolvedTitle,
          category: "Musica",
          is_live: true,
          stream_url: livepeer.ingestUrl,
          playback_url: livepeer.playbackUrl,
          playback_id: livepeer.playbackId,
          privacy_mode: privacyMode,
          ticket_price: ticketPrice,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      if (streamErr) throw streamErr;

      await updateProfileLiveState({
        userId: user.id,
        isLive: true,
        streamKey: livepeer.streamKey,
        playbackId: livepeer.playbackId,
      });

      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ live_status: "En Línea", updated_at: new Date().toISOString() })
        .eq("id", user.id);
      if (profileErr) throw profileErr;

      setStreamConfig({
        title: resolvedTitle,
        rawChannelName: requestedChannelName,
        streamKey: livepeer.streamKey,
        playbackId: livepeer.playbackId,
        playbackUrl: livepeer.playbackUrl,
        rtmpIngestUrl: livepeer.rtmpIngestUrl,
        ingestUrl: livepeer.ingestUrl,
        ticketPrice: isFree ? 0 : normalizedPrice,
        isFree,
      });
      setStatus("Canal Livepeer listo · tarjeta en línea");
      setIsConfigOpen(false);
      toast.success("Stream Livepeer creado. Usa el Stream Key en OBS/RTMP.");
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
      </div>

      <div className="relative z-10 mb-3 flex justify-center">
        <p className="rounded-full border border-cyan-300/35 bg-cyan-400/10 px-4 py-1 text-xs text-cyan-100">Estado: {status}</p>
      </div>
      {error && <p className="relative z-10 mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}

      <div className="relative z-10">
        <div className="mx-auto w-full max-w-xl space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200">Pantalla Central · Vista Local</p>
          <div
            id={localContainerId}
            className="h-[min(44vh,340px)] w-full overflow-hidden rounded-2xl border border-cyan-300/40 bg-black shadow-[0_0_40px_-10px_rgba(34,211,238,0.85)]"
          />
          <div className="pt-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button
                type="button"
                variant="hero"
                onClick={handleGenerateChannel}
                disabled={!canGenerate}
                className="min-h-12 min-w-[220px] px-8 text-sm font-bold uppercase tracking-wide"
              >
                Generar Canal
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void join()}
                disabled={!canGoLive}
                className="min-h-12 min-w-[220px] border-cyan-300/40 bg-cyan-500/20 text-cyan-100 hover:bg-cyan-500/30"
              >
                {connecting ? "Conectando..." : "Emitir Live"}
              </Button>
            </div>
            {joined && (
              <div className="mt-2 flex justify-center">
                <Button type="button" variant="outline" onClick={() => void stopLive()}>
                  Detener transmisión
                </Button>
              </div>
            )}
            {streamConfig && (
              <div className="mt-2 space-y-1 text-center text-xs text-cyan-100/90">
                <p>
                  {streamConfig.title} · {streamConfig.isFree ? "Gratuito" : `Ticket: $${streamConfig.ticketPrice.toFixed(2)} USD`}
                </p>
                <p className="break-all font-mono text-[10px] text-cyan-200/80">
                  Stream Key: {streamConfig.streamKey}
                </p>
                <p className="break-all font-mono text-[10px] text-cyan-200/80">
                  RTMP: {streamConfig.ingestUrl}
                </p>
                <p className="break-all font-mono text-[10px] text-violet-200/80">
                  Playback: {streamConfig.playbackUrl}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="border-cyan-300/40 bg-card/95 backdrop-blur-md sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Generar canal</DialogTitle>
            <DialogDescription>
              Se crea un stream en Livepeer Studio (stream key + enlace HLS para espectadores y Android).
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
              Guardar y generar canal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default AgoraLiveStreaming;
