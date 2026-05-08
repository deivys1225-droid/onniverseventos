import { useCallback, useMemo, useRef, useState } from "react";
import AgoraRTC, {
  type IAgoraRTCClient,
  type IAgoraRTCRemoteUser,
  type ICameraVideoTrack,
  type IMicrophoneAudioTrack,
} from "agora-rtc-sdk-ng";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LiveRole = "broadcaster" | "audience";

const APP_ID = (import.meta.env.NEXT_PUBLIC_AGORA_APP_ID as string | undefined)?.trim() ?? "";

const AgoraLiveStreaming = () => {
  const [role, setRole] = useState<LiveRole>("audience");
  const [channel, setChannel] = useState("al-universo-main");
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localVideoTrackRef = useRef<ICameraVideoTrack | null>(null);
  const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const remoteUsersRef = useRef<Record<string, IAgoraRTCRemoteUser>>({});

  const localContainerId = "agora-local-player";
  const remoteContainerId = "agora-remote-player";

  const canJoin = useMemo(() => Boolean(APP_ID) && channel.trim().length > 0 && !joined, [channel, joined]);

  const createClient = useCallback((nextRole: LiveRole) => {
    const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
    client.setClientRole(nextRole === "broadcaster" ? "host" : "audience");
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
    }
  }, []);

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
    if (!APP_ID) {
      setError("Falta NEXT_PUBLIC_AGORA_APP_ID en .env.local");
      return;
    }

    const room = channel.trim();
    if (!room) {
      setError("Escribe un nombre de canal.");
      return;
    }

    setError(null);

    try {
      const client = createClient(role);
      clientRef.current = client;

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

      await client.join(APP_ID, room, null, null);

      if (role === "broadcaster") {
        const [microphoneTrack, cameraTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
        localAudioTrackRef.current = microphoneTrack;
        localVideoTrackRef.current = cameraTrack;

        await client.publish([microphoneTrack, cameraTrack]);
        cameraTrack.play(localContainerId);
      } else {
        const remoteContainer = document.getElementById(remoteContainerId);
        if (remoteContainer) {
          remoteContainer.innerHTML =
            '<p class="text-sm text-muted-foreground">Conectado como audiencia. Esperando video...</p>';
        }
      }

      setJoined(true);
    } catch (e) {
      await leave();
      setError(e instanceof Error ? e.message : "No se pudo conectar al canal.");
    }
  }, [channel, createClient, leave, mountFirstRemoteUser, role]);

  return (
    <section className="mx-auto w-full max-w-5xl rounded-2xl border border-border/60 bg-card/40 p-4 backdrop-blur-sm md:p-6">
      <div className="mb-4 flex flex-col gap-2 md:mb-5">
        <h2 className="font-display text-xl font-bold text-foreground md:text-2xl">Streaming Agora (Al Universo)</h2>
        <p className="text-sm text-muted-foreground">
          Estructura base con roles Broadcaster y Audience, optimizada para móvil Android.
        </p>
      </div>

      <div className="mb-4 grid gap-3 md:mb-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="agora-channel">Canal</Label>
          <Input
            id="agora-channel"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            disabled={joined}
            placeholder="al-universo-main"
          />
        </div>
        <div className="space-y-2">
          <Label>Rol</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={role === "broadcaster" ? "hero" : "outline"}
              onClick={() => setRole("broadcaster")}
              disabled={joined}
              className="h-10 text-xs sm:text-sm"
            >
              Broadcaster
            </Button>
            <Button
              type="button"
              variant={role === "audience" ? "hero" : "outline"}
              onClick={() => setRole("audience")}
              disabled={joined}
              className="h-10 text-xs sm:text-sm"
            >
              Audience
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 md:mb-5">
        <Button type="button" onClick={() => void join()} disabled={!canJoin}>
          Unirse al canal
        </Button>
        <Button type="button" variant="outline" onClick={() => void leave()} disabled={!joined}>
          Salir
        </Button>
      </div>

      {error && <p className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vista local (Broadcaster)</p>
          <div id={localContainerId} className="aspect-video w-full overflow-hidden rounded-xl border border-border/60 bg-black" />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vista remota (Audience)</p>
          <div id={remoteContainerId} className="aspect-video w-full overflow-hidden rounded-xl border border-border/60 bg-black" />
        </div>
      </div>
    </section>
  );
};

export default AgoraLiveStreaming;
