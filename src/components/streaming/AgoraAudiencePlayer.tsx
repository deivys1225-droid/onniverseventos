import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Play } from "lucide-react";
import AgoraRTC, { type IAgoraRTCClient, type IAgoraRTCRemoteUser } from "agora-rtc-sdk-ng";
import { fetchAgoraAudienceSession, type AgoraAudienceSession } from "@/lib/agoraAudienceToken";
import { isStreamPlaybackUrl } from "@/lib/audiencePlayback";
import { resolveAgoraChannelFromRoom } from "@/lib/androidAgoraRoomEntry";

const APP_ID = (import.meta.env.NEXT_PUBLIC_AGORA_APP_ID as string | undefined)?.trim() ?? "";

export type AgoraAudiencePlayerProps = {
  channelName: string;
  title?: string;
  /** Une por WebRTC aunque exista window.Android (escena LIVE STREAM en navegador). */
  forceWebPlayback?: boolean;
  /** Si true, no hace join hasta que el usuario pulse el botón (token fresco vía API). */
  manualStart?: boolean;
  /** En vrcam: ocupa todo el panel sin aspect-ratio fijo. */
  compact?: boolean;
  /** Sesión Agora ya resuelta (appId + canal + token alineados). */
  prefetchedSession?: AgoraAudienceSession | null;
  /** Incrementar para unir todas las instancias con el mismo token (duplex). */
  connectNonce?: number;
  /** Si se define, el botón dispara esto (fetch único) en lugar del join interno. */
  onConnectRequest?: () => void | Promise<void>;
  /** Muestra App ID y origen del token (directo Agora, no túnel Android). */
  showConnectionInfo?: boolean;
  className?: string;
  onStatusChange?: (status: string) => void;
  onJoinedChange?: (joined: boolean) => void;
};

export function AgoraAudiencePlayer({
  channelName,
  title,
  forceWebPlayback = false,
  manualStart = false,
  compact = false,
  prefetchedSession = null,
  connectNonce = 0,
  onConnectRequest,
  showConnectionInfo = false,
  className = "",
  onStatusChange,
  onJoinedChange,
}: AgoraAudiencePlayerProps) {
  const instanceId = useId().replace(/:/g, "");
  const remoteContainerId = `agora-audience-${instanceId}`;
  const [status, setStatus] = useState(manualStart ? "Pulsa para ver en vivo" : "Listo para conectar");
  const [connecting, setConnecting] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const remoteUsersRef = useRef<Record<string, IAgoraRTCRemoteUser>>({});

  const patchStatus = useCallback(
    (next: string) => {
      setStatus(next);
      onStatusChange?.(next);
    },
    [onStatusChange],
  );

  const patchJoined = useCallback(
    (next: boolean) => {
      setJoined(next);
      onJoinedChange?.(next);
    },
    [onJoinedChange],
  );

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
  }, [remoteContainerId]);

  const leaveAudienceRoom = useCallback(async () => {
    const client = clientRef.current;
    clientRef.current = null;
    remoteUsersRef.current = {};
    if (client) {
      await client.leave();
    }
    patchJoined(false);
    setConnecting(false);
    patchStatus(manualStart ? "Pulsa para ver en vivo" : "Desconectado");
  }, [manualStart, patchJoined, patchStatus]);

  const joinAudienceRoom = useCallback(async () => {
    if (!APP_ID) {
      setError("Falta NEXT_PUBLIC_AGORA_APP_ID en .env.local");
      patchStatus("Configuración incompleta");
      return;
    }

    const routeChannel = channelName.trim();
    if (!routeChannel || isStreamPlaybackUrl(routeChannel)) {
      setError("Canal de Agora no válido.");
      patchStatus("Canal inválido");
      return;
    }

    try {
      setError(null);
      setConnecting(true);
      patchStatus("Obteniendo acceso…");
      await leaveAudienceRoom();
      setConnecting(true);

      let appIdForJoin = APP_ID;
      let channelToJoin = routeChannel;
      let audienceToken = prefetchedSession?.audienceToken.trim() ?? "";

      if (prefetchedSession) {
        appIdForJoin = prefetchedSession.appId;
        channelToJoin = prefetchedSession.channelName;
        audienceToken = prefetchedSession.audienceToken;
      } else if (manualStart || forceWebPlayback) {
        const session = await fetchAgoraAudienceSession(routeChannel);
        appIdForJoin = session.appId;
        channelToJoin = session.channelName;
        audienceToken = session.audienceToken;
      }

      if (!appIdForJoin) {
        setError("Falta App ID de Agora.");
        patchStatus("Configuración incompleta");
        return;
      }

      patchStatus(`Uniendo a ${channelToJoin}…`);

      const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
      clientRef.current = client;
      await client.setClientRole("audience");

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

      const joinWithTimeout = async (joinToken: string | null) => {
        const joinUid = joinToken ? 0 : null;
        const joinTask = client.join(appIdForJoin, channelToJoin, joinToken, joinUid);
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
        if (isStaticKeyProjectError) {
          await joinWithTimeout(null);
        } else {
          throw joinErr;
        }
      }

      patchJoined(true);
      setConnecting(false);
      patchStatus("En vivo");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo conectar a la sala.";
      setError(msg);
      patchStatus("Error de conexión");
      setConnecting(false);
      patchJoined(false);
    }
  }, [
    channelName,
    manualStart,
    forceWebPlayback,
    prefetchedSession,
    leaveAudienceRoom,
    mountFirstRemoteUser,
    patchJoined,
    patchStatus,
  ]);

  useEffect(() => {
    if (connectNonce > 0 && prefetchedSession?.audienceToken && manualStart) {
      void joinAudienceRoom();
    }
  }, [connectNonce, prefetchedSession, manualStart, joinAudienceRoom]);

  const handleStartClick = () => {
    if (onConnectRequest) {
      void onConnectRequest();
      return;
    }
    void joinAudienceRoom();
  };

  useEffect(() => {
    return () => {
      void leaveAudienceRoom();
    };
  }, [leaveAudienceRoom]);

  useEffect(() => {
    if (manualStart) {
      void leaveAudienceRoom();
      setError(null);
      return;
    }
    if (!forceWebPlayback && typeof window.Android !== "undefined") {
      patchStatus("Usa LIVE STREAM en el menú para ver en el navegador.");
      return;
    }
    if (!manualStart) {
      void joinAudienceRoom();
    }
  }, [channelName, manualStart, forceWebPlayback, joinAudienceRoom, leaveAudienceRoom, patchStatus]);

  const showStartOverlay = manualStart && !joined && !connecting;

  return (
    <div className={className}>
      <div className="relative">
      <div
        id={remoteContainerId}
        className={
          compact
            ? "h-full min-h-[12rem] w-full overflow-hidden rounded-lg border border-cyan-300/45 bg-black"
            : "aspect-video w-full overflow-hidden rounded-xl border border-cyan-300/45 bg-black shadow-[0_0_48px_-10px_rgba(34,211,238,0.95)]"
        }
      />
        {showStartOverlay && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-xl bg-black/75 p-4">
            <p className="text-center text-sm text-cyan-100/90">
              {title ? `${title}` : "Transmisión en vivo"}
            </p>
            <button
              type="button"
              onClick={handleStartClick}
              className="inline-flex min-h-[52px] items-center gap-2 rounded-xl border border-cyan-400/60 bg-cyan-500/20 px-6 py-3 text-sm font-semibold text-cyan-50 shadow-[0_0_32px_-8px_rgba(34,211,238,0.8)] transition hover:bg-cyan-500/35"
            >
              <Play className="h-5 w-5 fill-current" aria-hidden />
              Ver transmisión
            </button>
          </div>
        )}
        {connecting && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/60">
            <p className="text-sm text-cyan-100">Conectando…</p>
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-cyan-100">
          {title ? `${title} · ` : ""}
          {joined ? status : manualStart ? "Listo" : status}
        </p>
        {joined && (
          <button
            type="button"
            onClick={() => void joinAudienceRoom()}
            disabled={connecting}
            className="rounded-lg border border-cyan-400/40 px-3 py-1.5 text-xs font-medium text-cyan-50 hover:bg-cyan-500/10 disabled:opacity-50"
          >
            Reconectar
          </button>
        )}
      </div>
      {error && (
        <p className="mt-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {showConnectionInfo && (
        <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
          WebRTC directo · App ID{" "}
          {(prefetchedSession?.appId || APP_ID) ? (
            <span className="text-cyan-200/90">{(prefetchedSession?.appId || APP_ID).slice(0, 8)}…</span>
          ) : (
            <span className="text-destructive">no configurado</span>
          )}{" "}
          · Token vía Edge <span className="text-cyan-200/90">agora-token</span>
          {forceWebPlayback ? " · sin túnel Android" : ""}
          {prefetchedSession ? (
            <>
              {" "}
              · canal <span className="text-cyan-200/90">{prefetchedSession.channelName}</span>
            </>
          ) : null}
        </p>
      )}
    </div>
  );
}

/** Canal Agora desde fila active_streams + fallback de sala. */
export function channelFromActiveStream(
  streamUrl: string | undefined,
  fallbackChannel: string,
): string {
  return resolveAgoraChannelFromRoom({ channel: fallbackChannel }, { stream_url: streamUrl ?? "" });
}
