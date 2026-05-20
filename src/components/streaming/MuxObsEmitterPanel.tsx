import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, Radio, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  isAndroidLiveSelectorAvailable,
  openMuxLiveInAndroidSelector,
} from "@/lib/androidAgoraRoomEntry";
import { fetchMuxLiveStreamStatus } from "@/lib/fetchMuxLiveStreamStatus";
import { probeMuxStreamSignal, type MuxStreamSignalState } from "@/lib/muxStreamStatus";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type MuxObsStreamCredentials = {
  title: string;
  rawChannelName: string;
  liveStreamId: string;
  streamKey: string;
  playbackId: string;
  playbackUrl: string;
  /** Servidor RTMP (OBS → Servidor). */
  rtmpServer: string;
  /** URL RTMP completa (servidor + stream_key). */
  rtmpUrl: string;
};

type MuxObsEmitterPanelProps = {
  credentials: MuxObsStreamCredentials;
  onSignalActive?: () => void;
  onEndSession?: () => void;
  className?: string;
};

function CopyField({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  const copy = () => {
    void navigator.clipboard?.writeText(value);
    toast.success(`${label} copiado`);
  };

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-cyan-100/90">{label}</p>
      <div className="flex gap-2">
        <code
          className={cn(
            "flex-1 break-all rounded-md border border-cyan-400/30 bg-black/50 px-3 py-2 text-[11px] text-violet-100",
            mono && "font-mono",
          )}
        >
          {value}
        </code>
        <Button type="button" variant="outline" size="icon" className="shrink-0 border-cyan-400/40" onClick={copy}>
          <Copy className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/** Panel OBS/RTMP: credenciales Mux + tarjeta de estado → SelectorActivity en Android. */
export function MuxObsEmitterPanel({
  credentials,
  onSignalActive,
  onEndSession,
  className,
}: MuxObsEmitterPanelProps) {
  const [signal, setSignal] = useState<MuxStreamSignalState>("checking");
  const [notifiedActive, setNotifiedActive] = useState(false);
  const androidHandoffDoneRef = useRef(false);
  const isAndroid = isAndroidLiveSelectorAvailable();

  const launchAndroidSelector = useCallback(() => {
    const ok = openMuxLiveInAndroidSelector({
      playbackUrl: credentials.playbackUrl,
      playbackId: credentials.playbackId,
    });
    if (ok) {
      toast.success("Abriendo SelectorActivity con el stream HLS…");
      return true;
    }
    toast.error("Abre la app Android (APK) para ver el live en 360 / Mixta / Inmersiva.");
    return false;
  }, [credentials.playbackId, credentials.playbackUrl]);

  const poll = useCallback(async () => {
    const [hlsSignal, apiStatus] = await Promise.all([
      probeMuxStreamSignal(credentials.playbackId),
      credentials.liveStreamId
        ? fetchMuxLiveStreamStatus(credentials.liveStreamId)
        : Promise.resolve<"checking" | "active" | "idle" | "error">("checking"),
    ]);

    const next: MuxStreamSignalState =
      hlsSignal === "active" || apiStatus === "active"
        ? "active"
        : hlsSignal === "idle" || apiStatus === "idle"
          ? "idle"
          : hlsSignal === "error" && apiStatus === "error"
            ? "error"
            : "checking";

    setSignal(next);

    if (next === "active" && !notifiedActive) {
      setNotifiedActive(true);
      onSignalActive?.();
    }

    if (next === "active" && isAndroid && !androidHandoffDoneRef.current) {
      androidHandoffDoneRef.current = true;
      launchAndroidSelector();
    }
  }, [
    credentials.liveStreamId,
    credentials.playbackId,
    isAndroid,
    launchAndroidSelector,
    notifiedActive,
    onSignalActive,
  ]);

  useEffect(() => {
    void poll();
    const timer = window.setInterval(() => void poll(), 5000);
    return () => window.clearInterval(timer);
  }, [poll]);

  const isLive = signal === "active";
  const waiting = signal === "idle" || signal === "checking";

  return (
    <div className={cn("space-y-5", className)}>
      <button
        type="button"
        disabled={!isLive}
        onClick={() => {
          if (!isLive) return;
          launchAndroidSelector();
        }}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition",
          isLive
            ? "cursor-pointer border-red-400/50 bg-red-500/15 hover:bg-red-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
            : waiting
              ? "cursor-default border-amber-400/45 bg-amber-500/10"
              : "cursor-default border-destructive/40 bg-destructive/10",
        )}
      >
        <span
          className={cn(
            "h-3 w-3 shrink-0 rounded-full",
            isLive ? "animate-pulse bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.9)]" : "bg-amber-400",
          )}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            {isLive ? "En vivo" : waiting ? "Esperando señal" : "Error comprobando señal"}
          </p>
          <p className="text-xs text-muted-foreground">
            {isLive
              ? isAndroid
                ? "Toca para abrir SelectorActivity (360°, Mixta, Inmersiva) con el HLS cargado."
                : "Señal Mux activa. Usa la app Android para ver el stream."
              : "Configura OBS con la URL RTMP y pulsa Iniciar transmisión en OBS."}
          </p>
        </div>
        <Radio className={cn("h-5 w-5 shrink-0", isLive ? "text-red-400" : "text-amber-300")} aria-hidden />
      </button>

      <div className="space-y-4 rounded-xl border border-cyan-300/35 bg-black/40 p-4">
        <p className="text-sm text-cyan-50">
          En <strong>OBS</strong> → Ajustes → Emisión → Servicio <span className="font-mono">Personalizado</span>:
        </p>
        <CopyField label="Servidor RTMP (OBS → Servidor)" value={credentials.rtmpServer} />
        <CopyField label="Clave de transmisión (stream_key)" value={credentials.streamKey} />
        <CopyField label="URL RTMP completa (referencia)" value={credentials.rtmpUrl} />
        <CopyField label="Playback ID (espectadores)" value={credentials.playbackId} />
        <CopyField label="URL HLS (.m3u8) para Android" value={credentials.playbackUrl} />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {isAndroid ? (
          <Button
            type="button"
            variant="hero"
            disabled={!isLive}
            className="gap-2"
            onClick={() => launchAndroidSelector()}
          >
            <Smartphone className="h-4 w-4" />
            Abrir SelectorActivity
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">
            En navegador solo se configura OBS. La reproducción es en la app Android (SelectorActivity).
          </p>
        )}
        {onEndSession ? (
          <Button type="button" variant="outline" className="border-rose-400/50 text-rose-100" onClick={onEndSession}>
            Cerrar sesión Live
          </Button>
        ) : null}
      </div>
    </div>
  );
}
