import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, Radio, Users } from "lucide-react";
import AgoraRTC, { type IAgoraRTCClient, type IMicrophoneAudioTrack } from "agora-rtc-sdk-ng";
import { buildAgoraChannel } from "@/lib/agoraRooms";
import { fetchAgoraVoiceSession, type AgoraVoiceRole } from "@/lib/agoraClassVoiceToken";
import { requestOnniMicrophoneAccess } from "@/lib/requestOnniMicrophone";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type AgoraClassVoiceBridgeProps = {
  classSlug: string;
  role: AgoraVoiceRole | null;
};

type VoicePresencePayload = {
  user_id?: string;
  display_name?: string;
  voice_role?: AgoraVoiceRole | null;
  joined_at?: string;
};

type VoiceParticipant = {
  userId: string;
  displayName: string;
  role: AgoraVoiceRole;
  joinedAt: string;
  isSelf: boolean;
};

export default function AgoraClassVoiceBridge({ classSlug, role }: AgoraClassVoiceBridgeProps) {
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState("Voz inactiva");
  const [micEnabled, setMicEnabled] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const micTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const joiningRef = useRef(false);

  const channelName = useMemo(() => {
    const slug = classSlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
    return buildAgoraChannel(`class-voice-${slug || "main"}`);
  }, [classSlug]);
  const controlChannelName = useMemo(() => `class-voice-presence-${channelName}`, [channelName]);

  const leaveVoice = useCallback(async () => {
    const client = clientRef.current;
    const mic = micTrackRef.current;
    clientRef.current = null;
    micTrackRef.current = null;
    joiningRef.current = false;
    try {
      if (mic) {
        await mic.setEnabled(false).catch(() => undefined);
        mic.stop();
        mic.close();
      }
      if (client) await client.leave();
    } finally {
      setConnected(false);
      setStatus("Voz inactiva");
    }
  }, []);

  const joinVoice = useCallback(async () => {
    if (!role || !classSlug.trim()) {
      await leaveVoice();
      return;
    }
    if (joiningRef.current) return;
    joiningRef.current = true;

    try {
      setStatus("Conectando voz...");
      await leaveVoice();

      const session = await fetchAgoraVoiceSession(channelName, role);
      const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
      clientRef.current = client;
      await client.setClientRole(role === "host" ? "host" : "audience");

      client.on("user-published", async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        if (mediaType === "audio") user.audioTrack?.play();
      });

      await client.join(session.appId, session.channelName, session.token, null);

      if (role === "host") {
        const micPermission = await requestOnniMicrophoneAccess();
        if (micPermission !== "granted") {
          throw new Error("No se concedió permiso de micrófono para la clase.");
        }
        const micTrack = await AgoraRTC.createMicrophoneAudioTrack();
        micTrackRef.current = micTrack;
        await micTrack.setEnabled(micEnabled);
        await client.publish([micTrack]);
      }

      setConnected(true);
      setStatus(role === "host" ? "Micrófono del docente activo" : "Escuchando al docente");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo iniciar Agora Voice.";
      setConnected(false);
      setStatus("Error de voz");
      toast.error(message);
      await leaveVoice();
    } finally {
      joiningRef.current = false;
    }
  }, [channelName, classSlug, leaveVoice, micEnabled, role]);

  useEffect(() => {
    void joinVoice();
    return () => {
      void leaveVoice();
    };
  }, [joinVoice, leaveVoice]);

  useEffect(() => {
    if (!role || !classSlug.trim()) return;
    let cancelled = false;
    let presenceChannel: ReturnType<typeof supabase.channel> | null = null;
    let selfUserId = "";

    const normalizeRole = (value: unknown): AgoraVoiceRole =>
      value === "host" || value === "audience" ? value : "audience";

    const rebuildParticipants = () => {
      if (!presenceChannel || cancelled) return;
      const presence = presenceChannel.presenceState();
      const next: VoiceParticipant[] = [];
      Object.values(presence).forEach((entries) => {
        entries.forEach((entry) => {
          const payload = entry as VoicePresencePayload;
          const userId = typeof payload.user_id === "string" ? payload.user_id : "";
          if (!userId) return;
          const displayName =
            typeof payload.display_name === "string" && payload.display_name.trim()
              ? payload.display_name.trim()
              : userId;
          const joinedAt =
            typeof payload.joined_at === "string" && payload.joined_at.trim()
              ? payload.joined_at
              : new Date().toISOString();
          next.push({
            userId,
            displayName,
            role: normalizeRole(payload.voice_role),
            joinedAt,
            isSelf: userId === selfUserId,
          });
        });
      });

      next.sort((a, b) => {
        if (a.role !== b.role) return a.role === "host" ? -1 : 1;
        return a.joinedAt.localeCompare(b.joinedAt);
      });
      setParticipants(next);
    };

    const setupPresence = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user || cancelled) return;
      selfUserId = user.id;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name,display_name")
        .eq("id", user.id)
        .maybeSingle();

      const profile = profileData as { full_name?: string | null; display_name?: string | null } | null;
      const metadataName =
        typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name.trim() : "";
      const displayName =
        profile?.display_name?.trim() ||
        profile?.full_name?.trim() ||
        metadataName ||
        user.email ||
        user.id;

      presenceChannel = supabase.channel(controlChannelName, {
        config: { presence: { key: user.id } },
      });

      presenceChannel
        .on("presence", { event: "sync" }, rebuildParticipants)
        .on("presence", { event: "join" }, rebuildParticipants)
        .on("presence", { event: "leave" }, rebuildParticipants)
        .subscribe(async (subscribeStatus) => {
          if (subscribeStatus !== "SUBSCRIBED" || !presenceChannel || cancelled) return;
          await presenceChannel.track({
            user_id: user.id,
            display_name: displayName,
            voice_role: role,
            joined_at: new Date().toISOString(),
          });
        });
    };

    void setupPresence();
    return () => {
      cancelled = true;
      if (!presenceChannel) return;
      void presenceChannel.untrack();
      void supabase.removeChannel(presenceChannel);
      setParticipants([]);
      setPanelOpen(false);
    };
  }, [classSlug, controlChannelName, role]);

  const toggleMic = async () => {
    if (role !== "host") return;
    const track = micTrackRef.current;
    const next = !micEnabled;
    setMicEnabled(next);
    if (!track) return;
    await track.setEnabled(next);
    setStatus(next ? "Micrófono del docente activo" : "Micrófono silenciado");
  };

  if (!role || !classSlug.trim()) return null;

  return (
    <div className="fixed bottom-14 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-cyan-400/35 bg-black/55 px-3 py-2 text-[11px] text-cyan-100 backdrop-blur-md">
      <Radio className="h-3.5 w-3.5" aria-hidden />
      <span>{connected ? status : "Voz conectando..."}</span>
      {role === "host" && (
        <>
          <button
            type="button"
            onClick={() => setPanelOpen((prev) => !prev)}
            className="inline-flex items-center gap-1 rounded-full border border-cyan-300/40 bg-cyan-500/15 px-2 py-1 text-[10px] font-semibold text-cyan-50 transition hover:bg-cyan-500/30"
            title="Ver alumnos conectados"
          >
            <Users className="h-3.5 w-3.5" aria-hidden />
            <span>{participants.filter((item) => item.role === "audience").length}</span>
          </button>
          <button
            type="button"
            onClick={() => void toggleMic()}
            className="inline-flex items-center rounded-full border border-cyan-300/40 bg-cyan-500/15 px-2 py-1 text-[10px] font-semibold text-cyan-50 transition hover:bg-cyan-500/30"
            title={micEnabled ? "Silenciar micrófono" : "Activar micrófono"}
          >
            {micEnabled ? <Mic className="h-3.5 w-3.5" aria-hidden /> : <MicOff className="h-3.5 w-3.5" aria-hidden />}
          </button>
        </>
      )}
      {role === "host" && panelOpen && (
        <div className="absolute bottom-12 left-1/2 z-40 w-[min(92vw,320px)] -translate-x-1/2 rounded-xl border border-cyan-400/35 bg-slate-950/95 p-3 text-xs text-cyan-100 shadow-[0_0_28px_-8px_rgba(34,211,238,0.8)]">
          <p className="mb-2 font-semibold">Conectados en clase ({participants.length})</p>
          {participants.length === 0 ? (
            <p className="text-cyan-200/70">Aun no hay usuarios conectados.</p>
          ) : (
            <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
              {participants.map((participant) => (
                <div
                  key={`${participant.userId}-${participant.joinedAt}`}
                  className="flex items-center justify-between rounded border border-cyan-400/20 bg-cyan-950/25 px-2 py-1"
                >
                  <span className="truncate pr-2">
                    {participant.displayName}
                    {participant.isSelf ? " (tu)" : ""}
                  </span>
                  <span className="uppercase text-[10px] tracking-wide text-cyan-200/80">
                    {participant.role === "host" ? "docente" : "alumno"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

