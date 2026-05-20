import { useCallback, useEffect, useState } from "react";
import { Copy, ExternalLink, Radio } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { buildEspectadorLivePath } from "@/lib/espectadorRoutes";
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

/** Panel OBS/RTMP: credenciales Mux + estado de señal (polling + API Mux). */
export function MuxObsEmitterPanel({
  credentials,
  onSignalActive,
  onEndSession,
  className,
}: MuxObsEmitterPanelProps) {
  const [signal, setSignal] = useState<MuxStreamSignalState>("checking");
  const [notifiedActive, setNotifiedActive] = useState(false);

  const viewerPath = buildEspectadorLivePath({
    channel: credentials.rawChannelName,
    playbackId: credentials.playbackId,
    title: credentials.title,
  });

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
  }, [credentials.liveStreamId, credentials.playbackId, notifiedActive, onSignalActive]);

  useEffect(() => {
    void poll();
    const timer = window.setInterval(() => void poll(), 5000);
    return () => window.clearInterval(timer);
  }, [poll]);

  const isLive = signal === "active";
  const waiting = signal === "idle" || signal === "checking";

  return (
    <div className={cn("space-y-5", className)}>
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl border px-4 py-3",
          isLive
            ? "border-red-400/50 bg-red-500/15"
            : waiting
              ? "border-amber-400/45 bg-amber-500/10"
              : "border-destructive/40 bg-destructive/10",
        )}
      >
        <span
          className={cn(
            "h-3 w-3 shrink-0 rounded-full",
            isLive ? "animate-pulse bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.9)]" : "bg-amber-400",
          )}
        />
        <div>
          <p className="text-sm font-semibold text-foreground">
            {isLive ? "En vivo" : waiting ? "Esperando señal" : "Error comprobando señal"}
          </p>
          <p className="text-xs text-muted-foreground">
            {isLive
              ? "Mux recibe video desde OBS. Los espectadores ya pueden entrar."
              : "Configura OBS con la URL RTMP y pulsa Iniciar transmisión en OBS."}
          </p>
        </div>
        <Radio className={cn("ml-auto h-5 w-5", isLive ? "text-red-400" : "text-amber-300")} aria-hidden />
      </div>

      <div className="rounded-xl border border-cyan-300/35 bg-black/40 p-4 space-y-4">
        <p className="text-sm text-cyan-50">
          En <strong>OBS</strong> → Ajustes → Emisión → Servicio <span className="font-mono">Personalizado</span>:
        </p>
        <CopyField label="Servidor RTMP (OBS → Servidor)" value={credentials.rtmpServer} />
        <CopyField label="Clave de transmisión (stream_key)" value={credentials.streamKey} />
        <CopyField label="URL RTMP completa (referencia)" value={credentials.rtmpUrl} />
        <CopyField label="Playback ID (espectadores / Mux Player)" value={credentials.playbackId} />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button type="button" variant="outline" className="border-cyan-400/40" asChild disabled={!isLive}>
          <Link to={viewerPath}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Abrir sala espectadores
          </Link>
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={!isLive}
          onClick={() => {
            void navigator.clipboard?.writeText(`${window.location.origin}${viewerPath}`);
            toast.success("Enlace de sala copiado");
          }}
        >
          Copiar enlace sala
        </Button>
        {onEndSession ? (
          <Button type="button" variant="outline" className="border-rose-400/50 text-rose-100" onClick={onEndSession}>
            Cerrar sesión Live
          </Button>
        ) : null}
      </div>

      <p className="text-center text-[10px] text-muted-foreground">
        HLS Mux: <span className="break-all font-mono">{credentials.playbackUrl}</span>
      </p>
    </div>
  );
}
