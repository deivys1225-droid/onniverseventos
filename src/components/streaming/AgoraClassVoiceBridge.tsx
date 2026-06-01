import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, Radio } from "lucide-react";
import AgoraRTC, { type IAgoraRTCClient, type IMicrophoneAudioTrack } from "agora-rtc-sdk-ng";
import { buildAgoraChannel } from "@/lib/agoraRooms";
import { fetchAgoraVoiceSession, type AgoraVoiceRole } from "@/lib/agoraClassVoiceToken";
import { requestOnniMicrophoneAccess } from "@/lib/requestOnniMicrophone";
import { toast } from "sonner";

type AgoraClassVoiceBridgeProps = {
  classSlug: string;
  role: AgoraVoiceRole | null;
};

export default function AgoraClassVoiceBridge({ classSlug, role }: AgoraClassVoiceBridgeProps) {
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState("Voz inactiva");
  const [micEnabled, setMicEnabled] = useState(true);
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const micTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const joiningRef = useRef(false);

  const channelName = useMemo(() => {
    const slug = classSlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
    return buildAgoraChannel(`class-voice-${slug || "main"}`);
  }, [classSlug]);

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
        <button
          type="button"
          onClick={() => void toggleMic()}
          className="inline-flex items-center rounded-full border border-cyan-300/40 bg-cyan-500/15 px-2 py-1 text-[10px] font-semibold text-cyan-50 transition hover:bg-cyan-500/30"
          title={micEnabled ? "Silenciar micrófono" : "Activar micrófono"}
        >
          {micEnabled ? <Mic className="h-3.5 w-3.5" aria-hidden /> : <MicOff className="h-3.5 w-3.5" aria-hidden />}
        </button>
      )}
    </div>
  );
}

