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

type VoiceParticipant = {
  userId: string;
  name: string;
  role: AgoraVoiceRole;
  canSpeak: boolean;
};

type IncomingMicRequest = {
  fromUserId: string;
  fromName: string;
};

function sanitizeClassSlug(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
}

export default function AgoraClassVoiceBridge({ classSlug, role }: AgoraClassVoiceBridgeProps) {
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState("Voz inactiva");
  const [micEnabled, setMicEnabled] = useState(true);
  const [canSpeak, setCanSpeak] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const [incomingMicRequest, setIncomingMicRequest] = useState<IncomingMicRequest | null>(null);
  const [currentUserId, setCurrentUserId] = useState("");
  const [currentUserName, setCurrentUserName] = useState("Docente");
  const [requestedUsers, setRequestedUsers] = useState<Record<string, boolean>>({});
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const micTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const joiningRef = useRef(false);

  const channelName = useMemo(() => {
    const slug = sanitizeClassSlug(classSlug);
    return buildAgoraChannel(`class-voice-${slug || "main"}`);
  }, [classSlug]);
  const controlChannelName = useMemo(() => `class-voice-control-${sanitizeClassSlug(classSlug) || "main"}`, [classSlug]);
  const isTeacher = role === "host";
  const effectiveRole: AgoraVoiceRole | null = role ? (role === "host" || canSpeak ? "host" : "audience") : null;

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

  useEffect(() => {
    if (role !== "audience") {
      setCanSpeak(false);
      return;
    }
    // Estudiantes inician como audiencia hasta que docente apruebe su microfono.
    setCanSpeak(false);
  }, [role]);

  useEffect(() => {
    let mounted = true;
    const loadIdentity = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user || !mounted) return;
      setCurrentUserId(user.id);
      const fallbackName =
        (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
        "Usuario";
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      if (!mounted) return;
      const profileName = ((profile as { full_name?: string } | null)?.full_name ?? "").trim();
      setCurrentUserName(profileName || fallbackName);
    };
    void loadIdentity();
    return () => {
      mounted = false;
    };
  }, []);

  const upsertParticipantsFromPresence = useCallback(() => {
    const channel = supabase.getChannels().find((item) => item.topic === `realtime:${controlChannelName}`);
    if (!channel) return;
    const state = channel.presenceState<Record<string, unknown>>();
    const list: VoiceParticipant[] = [];
    for (const entries of Object.values(state)) {
      for (const entry of entries as Record<string, unknown>[]) {
        const userId = typeof entry.userId === "string" ? entry.userId.trim() : "";
        if (!userId) continue;
        const participantRole =
          entry.role === "host" || entry.role === "audience" ? (entry.role as AgoraVoiceRole) : "audience";
        const name = typeof entry.name === "string" && entry.name.trim() ? entry.name.trim() : "Usuario";
        list.push({
          userId,
          name,
          role: participantRole,
          canSpeak: Boolean(entry.canSpeak),
        });
      }
    }
    const deduped = Array.from(new Map(list.map((item) => [item.userId, item])).values());
    setParticipants(deduped.sort((a, b) => a.name.localeCompare(b.name)));
  }, [controlChannelName]);

  const joinVoice = useCallback(async () => {
    if (!effectiveRole || !classSlug.trim()) {
      await leaveVoice();
      return;
    }
    if (joiningRef.current) return;
    joiningRef.current = true;

    try {
      setStatus("Conectando voz...");
      await leaveVoice();

      const session = await fetchAgoraVoiceSession(channelName, effectiveRole);
      const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
      clientRef.current = client;
      await client.setClientRole(effectiveRole === "host" ? "host" : "audience");

      client.on("user-published", async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        if (mediaType === "audio") user.audioTrack?.play();
      });

      await client.join(session.appId, session.channelName, session.token, null);

      if (effectiveRole === "host") {
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
      if (role === "host") {
        setStatus("Micrófono del docente activo");
      } else if (effectiveRole === "host") {
        setStatus("Tu micrófono está habilitado por el docente");
      } else {
        setStatus("Escuchando al docente");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo iniciar Agora Voice.";
      setConnected(false);
      setStatus("Error de voz");
      toast.error(message);
      await leaveVoice();
    } finally {
      joiningRef.current = false;
    }
  }, [channelName, classSlug, effectiveRole, leaveVoice, micEnabled, role]);

  useEffect(() => {
    void joinVoice();
    return () => {
      void leaveVoice();
    };
  }, [joinVoice, leaveVoice]);

  useEffect(() => {
    if (!classSlug.trim() || !currentUserId || !role) return;
    const channel = supabase.channel(controlChannelName, {
      config: {
        presence: { key: currentUserId },
        broadcast: { self: false },
      },
    });
    const trackPresence = () =>
      channel.track({
        userId: currentUserId,
        name: currentUserName,
        role,
        canSpeak: role === "host" ? true : canSpeak,
      });

    channel
      .on("presence", { event: "sync" }, () => upsertParticipantsFromPresence())
      .on("broadcast", { event: "mic-request" }, ({ payload }) => {
        if (role !== "audience") return;
        const targetUserId = typeof payload?.targetUserId === "string" ? payload.targetUserId : "";
        if (targetUserId !== currentUserId) return;
        setIncomingMicRequest({
          fromUserId: typeof payload?.fromUserId === "string" ? payload.fromUserId : "",
          fromName:
            typeof payload?.fromName === "string" && payload.fromName.trim()
              ? payload.fromName.trim()
              : "Docente",
        });
      })
      .on("broadcast", { event: "mic-revoke" }, ({ payload }) => {
        const targetUserId = typeof payload?.targetUserId === "string" ? payload.targetUserId : "";
        if (targetUserId !== currentUserId) return;
        setCanSpeak(false);
        toast.info("El docente retiró tu turno de micrófono.");
      })
      .on("broadcast", { event: "mic-response" }, ({ payload }) => {
        if (role !== "host") return;
        const userId = typeof payload?.userId === "string" ? payload.userId : "";
        if (!userId) return;
        const approved = Boolean(payload?.approved);
        setRequestedUsers((prev) => {
          if (!approved) {
            const next = { ...prev };
            delete next[userId];
            return next;
          }
          return { ...prev, [userId]: true };
        });
      });

    channel.subscribe((subscribeStatus) => {
      if (subscribeStatus !== "SUBSCRIBED") return;
      void trackPresence().then(() => upsertParticipantsFromPresence());
    });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [canSpeak, classSlug, controlChannelName, currentUserId, currentUserName, role, upsertParticipantsFromPresence]);

  useEffect(() => {
    if (!classSlug.trim() || !currentUserId || !role) return;
    const channel = supabase.getChannels().find((item) => item.topic === `realtime:${controlChannelName}`);
    if (!channel) return;
    void channel.track({
      userId: currentUserId,
      name: currentUserName,
      role,
      canSpeak: role === "host" ? true : canSpeak,
    });
  }, [canSpeak, classSlug, controlChannelName, currentUserId, currentUserName, role]);

  const toggleMic = async () => {
    if (effectiveRole !== "host") return;
    const track = micTrackRef.current;
    const next = !micEnabled;
    setMicEnabled(next);
    if (!track) return;
    await track.setEnabled(next);
    if (role === "host") {
      setStatus(next ? "Micrófono del docente activo" : "Micrófono silenciado");
    } else {
      setStatus(next ? "Tu micrófono está habilitado por el docente" : "Micrófono silenciado");
    }
  };

  const requestStudentMic = async (participant: VoiceParticipant) => {
    const channel = supabase.getChannels().find((item) => item.topic === `realtime:${controlChannelName}`);
    if (!channel) return;
    await channel.send({
      type: "broadcast",
      event: "mic-request",
      payload: {
        targetUserId: participant.userId,
        fromUserId: currentUserId,
        fromName: currentUserName,
      },
    });
    setRequestedUsers((prev) => ({ ...prev, [participant.userId]: true }));
  };

  const revokeStudentMic = async (participant: VoiceParticipant) => {
    const channel = supabase.getChannels().find((item) => item.topic === `realtime:${controlChannelName}`);
    if (!channel) return;
    await channel.send({
      type: "broadcast",
      event: "mic-revoke",
      payload: { targetUserId: participant.userId },
    });
    setRequestedUsers((prev) => {
      const next = { ...prev };
      delete next[participant.userId];
      return next;
    });
  };

  const respondMicRequest = async (approved: boolean) => {
    const channel = supabase.getChannels().find((item) => item.topic === `realtime:${controlChannelName}`);
    if (!channel || !incomingMicRequest) return;
    await channel.send({
      type: "broadcast",
      event: "mic-response",
      payload: {
        userId: currentUserId,
        userName: currentUserName,
        approved,
      },
    });
    if (approved) {
      setCanSpeak(true);
      toast.success("Micrófono habilitado por el docente.");
    } else {
      setCanSpeak(false);
      toast.info("Solicitud de micrófono rechazada.");
    }
    setIncomingMicRequest(null);
  };

  if (!role || !classSlug.trim()) return null;

  const visibleStudents = participants.filter((participant) => participant.userId !== currentUserId && participant.role === "audience");

  return (
    <div className="fixed bottom-14 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-cyan-400/35 bg-black/55 px-3 py-2 text-[11px] text-cyan-100 backdrop-blur-md">
      <Radio className="h-3.5 w-3.5" aria-hidden />
      <span>{connected ? status : "Voz conectando..."}</span>
      {effectiveRole === "host" && (
        <button
          type="button"
          onClick={() => void toggleMic()}
          className="inline-flex items-center rounded-full border border-cyan-300/40 bg-cyan-500/15 px-2 py-1 text-[10px] font-semibold text-cyan-50 transition hover:bg-cyan-500/30"
          title={micEnabled ? "Silenciar micrófono" : "Activar micrófono"}
        >
          {micEnabled ? <Mic className="h-3.5 w-3.5" aria-hidden /> : <MicOff className="h-3.5 w-3.5" aria-hidden />}
        </button>
      )}
      {isTeacher && (
        <>
          <button
            type="button"
            onClick={() => setPanelOpen((prev) => !prev)}
            className="inline-flex items-center rounded-full border border-cyan-300/40 bg-cyan-500/15 px-2 py-1 text-[10px] font-semibold text-cyan-50 transition hover:bg-cyan-500/30"
            title="Ver alumnos conectados"
          >
            <Users className="h-3.5 w-3.5" aria-hidden />
          </button>
          {panelOpen && (
            <div className="fixed right-4 top-16 z-40 w-[min(92vw,390px)] rounded-xl border border-cyan-400/40 bg-slate-950/95 p-3 shadow-[0_0_28px_-6px_rgba(34,211,238,0.55)] backdrop-blur-md">
              <p className="mb-2 text-sm font-semibold text-cyan-100">Alumnos conectados ({visibleStudents.length})</p>
              {visibleStudents.length === 0 ? (
                <p className="text-xs text-slate-300">No hay alumnos conectados en este momento.</p>
              ) : (
                <div className="max-h-72 space-y-2 overflow-auto pr-1">
                  {visibleStudents.map((participant) => {
                    const isEnabled = participant.canSpeak || Boolean(requestedUsers[participant.userId]);
                    return (
                      <div key={participant.userId} className="rounded-lg border border-slate-700/70 bg-slate-900/70 p-2">
                        <p className="truncate text-xs font-semibold text-slate-100">{participant.name}</p>
                        <p className="text-[10px] text-slate-300">
                          Estado: {participant.canSpeak ? "Puede hablar" : "Solo escucha"}
                        </p>
                        <div className="mt-2 flex gap-2">
                          {isEnabled ? (
                            <button
                              type="button"
                              onClick={() => void revokeStudentMic(participant)}
                              className="rounded border border-rose-400/40 bg-rose-500/15 px-2 py-1 text-[10px] font-semibold text-rose-100 hover:bg-rose-500/30"
                            >
                              Quitar microfono
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void requestStudentMic(participant)}
                              className="rounded border border-emerald-400/40 bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold text-emerald-100 hover:bg-emerald-500/30"
                            >
                              Habilitar microfono
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
      {incomingMicRequest && (
        <div className="fixed bottom-28 left-1/2 z-40 w-[min(92vw,360px)] -translate-x-1/2 rounded-xl border border-cyan-400/40 bg-slate-950/95 p-3 shadow-[0_0_28px_-6px_rgba(34,211,238,0.55)] backdrop-blur-md">
          <p className="text-xs font-semibold text-cyan-100">{incomingMicRequest.fromName} quiere habilitar tu micrófono</p>
          <p className="mt-1 text-[11px] text-slate-300">Debes aceptar para poder hablar en la clase.</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => void respondMicRequest(true)}
              className="rounded border border-emerald-400/40 bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold text-emerald-100 hover:bg-emerald-500/30"
            >
              Aceptar
            </button>
            <button
              type="button"
              onClick={() => void respondMicRequest(false)}
              className="rounded border border-rose-400/40 bg-rose-500/15 px-2 py-1 text-[10px] font-semibold text-rose-100 hover:bg-rose-500/30"
            >
              Rechazar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

