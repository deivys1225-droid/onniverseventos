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
import { buildAgoraChannel } from "@/lib/agoraRooms";
import { supabase, supabasePublicUrl, supabasePublishableKey } from "@/integrations/supabase/client";
import { toast } from "sonner";

const APP_ID = (import.meta.env.NEXT_PUBLIC_AGORA_APP_ID as string | undefined)?.trim() ?? "";
const ENV_TOKEN = (import.meta.env.NEXT_PUBLIC_AGORA_TOKEN as string | undefined)?.trim() ?? "";

/** Pide cámara + micrófono y libera tracks (solo para disparar el diálogo del sistema / WebView antes de generar canal). */
async function requestCameraMicForPrompt(): Promise<void> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("Este navegador no permite acceder a cámara y micrófono.");
  }
  if (typeof window !== "undefined" && !window.isSecureContext) {
    throw new Error("La cámara requiere HTTPS o localhost.");
  }
  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  stream.getTracks().forEach((t) => t.stop());
}

type StreamConfig = {
  appId: string;
  title: string;
  rawChannelName: string;
  channel: string;
  hostToken: string;
  audienceToken: string;
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
  const canGoLive = useMemo(() => Boolean(streamConfig?.appId) && Boolean(streamConfig) && !joined && !connecting, [streamConfig, joined, connecting]);

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
    if (!streamConfig.appId) {
      setError("No se recibió APP ID de Agora al generar el canal.");
      return;
    }
    const room = streamConfig.channel.trim();
    if (!room) {
      setError("No se configuró el canal interno de transmisión.");
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

      /**
       * En WebView Android, el permiso debe ligarse al gesto del usuario: si primero hacemos
       * await client.join() (varios segundos), getUserMedia puede dar NotAllowedError sin diálogo.
       * Por eso pedimos cámara/micrófono antes de unir al canal.
       */
      setStatus("Permisos de cámara y micrófono…");
      const [microphoneTrack, cameraTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
      localAudioTrackRef.current = microphoneTrack;
      localVideoTrackRef.current = cameraTrack;

      setStatus("Conectando a Agora…");
      const client = createClient();
      clientRef.current = client;
      await client.setClientRole("host");
      setStatus("Entrando al canal…");

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

      const normalizedToken = streamConfig.hostToken.trim();
      const joinWithTimeout = async (token: string | null) => {
        const joinTask = client.join(streamConfig.appId, room, token, null);
        const joinTimeout = new Promise<never>((_, reject) => {
          window.setTimeout(() => reject(new Error("Timeout al conectar con Agora (10s).")), 10000);
        });
        await Promise.race([joinTask, joinTimeout]);
      };

      try {
        await joinWithTimeout(normalizedToken || null);
      } catch (joinErr) {
        const rawJoinMessage = joinErr instanceof Error ? joinErr.message : String(joinErr);
        const normalizedJoinMessage = rawJoinMessage.toUpperCase();
        const isStaticKeyProjectError =
          normalizedJoinMessage.includes("CAN_NOT_GET_GATEWAY_SERVER") &&
          normalizedJoinMessage.includes("DYNAMIC USE STATIC KEY");
        if (!isStaticKeyProjectError) throw joinErr;
        await joinWithTimeout(null);
      }
      setStatus("Publicando transmisión…");
      await client.publish([microphoneTrack, cameraTrack]);
      cameraTrack.play(localContainerId);
      setStatus("Transmitiendo en vivo");

      const privacyMode = streamConfig.isFree ? "publico" : "privado_ticket";
      const ticketPrice = streamConfig.isFree ? null : Number(streamConfig.ticketPrice.toFixed(2));
      const { error: streamErr } = await supabase.from("active_streams").upsert(
        {
          user_id: user.id,
          title: streamConfig.title,
          category: "Musica",
          is_live: true,
          stream_url: streamConfig.channel,
          playback_url: streamConfig.audienceToken || null,
          privacy_mode: privacyMode,
          ticket_price: ticketPrice,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      if (streamErr) throw streamErr;

      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ live_status: "En Línea", updated_at: new Date().toISOString() })
        .eq("id", user.id);
      if (profileErr) throw profileErr;

      setJoined(true);
      setConnecting(false);
      toast.success("Live iniciado. Tu tarjeta ya aparece En Línea.");
    } catch (e) {
      await leave();
      const rawMessage = e instanceof Error ? e.message : "No se pudo conectar al canal.";
      const normalizedMessage = rawMessage.toUpperCase();
      if (normalizedMessage.includes("CAN_NOT_GET_GATEWAY_SERVER")) {
        setError(
          "Agora requiere token dinámico para este proyecto. Configura NEXT_PUBLIC_AGORA_TOKEN con un token RTC válido.",
        );
        return;
      }
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
      /**
       * Mismo gesto que «Guardar y generar canal»: primero permisos (importante en Android WebView),
       * luego toda la lógica que ya tenías (invoke agora-token, upsert active_streams, profiles, streamConfig).
       */
      setStatus("Permisos de cámara y micrófono…");
      await requestCameraMicForPrompt();

      setConnecting(true);
      setStatus("Solicitando token a Agora...");

      let data: Record<string, unknown> | null = null;
      const { data: invokedData, error: fnError } = await supabase.functions.invoke("agora-token", {
        body: {
          channelName: requestedChannelName,
          uid: 0,
        },
      });

      if (!fnError && invokedData) {
        data = invokedData as Record<string, unknown>;
      } else {
        // Fallback robusto por si el helper de Supabase falla en algunos navegadores.
        const endpoint = `${supabasePublicUrl}/functions/v1/agora-token`;
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: supabasePublishableKey,
            Authorization: `Bearer ${supabasePublishableKey}`,
          },
          body: JSON.stringify({
            channelName: requestedChannelName,
            uid: 0,
          }),
        });
        const responseJson = (await response.json()) as Record<string, unknown>;
        if (!response.ok) {
          const backendError = String(responseJson.error ?? "");
          throw new Error(backendError || fnError?.message || "No se pudo generar token de Agora.");
        }
        data = responseJson;
      }

      const resolvedAppId = (data?.appId as string | undefined)?.trim() || APP_ID;
      if (!resolvedAppId) {
        throw new Error("Agora no devolvió APP ID y no existe fallback en entorno.");
      }
      const resolvedChannel = (data?.channelName as string | undefined)?.trim() || buildAgoraChannel(requestedChannelName);
      const hostToken = (data?.hostToken as string | undefined)?.trim() || ENV_TOKEN;
      const audienceToken = (data?.audienceToken as string | undefined)?.trim() || ENV_TOKEN;
      if (!hostToken) {
        throw new Error("Agora no devolvió token host y no existe fallback en entorno.");
      }

      const resolvedTitle = `Canal ${requestedChannelName}`;
      const privacyMode = isFree ? "publico" : "privado_ticket";
      const ticketPrice = isFree ? null : Number(normalizedPrice.toFixed(2));

      const { error: streamErr } = await supabase.from("active_streams").upsert(
        {
          user_id: user.id,
          title: resolvedTitle,
          category: "Musica",
          is_live: true,
          stream_url: resolvedChannel,
          playback_url: audienceToken || null,
          privacy_mode: privacyMode,
          ticket_price: ticketPrice,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      if (streamErr) throw streamErr;

      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ live_status: "En Línea", updated_at: new Date().toISOString() })
        .eq("id", user.id);
      if (profileErr) throw profileErr;

      setStreamConfig({
        appId: resolvedAppId,
        title: resolvedTitle,
        rawChannelName: requestedChannelName,
        channel: resolvedChannel,
        hostToken,
        audienceToken,
        ticketPrice: isFree ? 0 : normalizedPrice,
        isFree,
      });
      setStatus("Canal generado y tarjeta en línea");
      setIsConfigOpen(false);
      toast.success("Canal generado. Tu tarjeta ya está en línea.");
    } catch (e) {
      const message = e instanceof Error ? e.message : `No se pudo generar el canal (${JSON.stringify(e)})`;
      const up = message.toUpperCase();
      if (
        up.includes("PERMISSION_DENIED") ||
        up.includes("PERMISSION DENIED") ||
        up.includes("NOTALLOWEDERROR")
      ) {
        setError(
          "Sin permiso de cámara o micrófono no se puede preparar el Live. En Android: Ajustes → Apps → esta app → Permisos.",
        );
        setStatus("Permisos necesarios");
      } else {
        setError(message);
        setStatus("Error al generar canal");
      }
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
              <p className="mt-2 text-center text-xs text-cyan-100/90">
                Canal: {streamConfig.rawChannelName} (auto) · {streamConfig.isFree ? "Gratuito" : `Ticket: $${streamConfig.ticketPrice.toFixed(2)} USD`}
              </p>
            )}
            {!ENV_TOKEN && (
              <p className="mt-2 text-center text-xs text-amber-300">
                Aviso: no se encontró token fallback en entorno. Configura backend de token para emitir.
              </p>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="border-cyan-300/40 bg-card/95 backdrop-blur-md sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Generar canal</DialogTitle>
            <DialogDescription>
              El sistema genera el canal con tu nombre, pide token a Agora y actualiza tu tarjeta. Al pulsar «Guardar y
              generar canal» se solicitarán primero cámara y micrófono (necesarios para emitir después).
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
