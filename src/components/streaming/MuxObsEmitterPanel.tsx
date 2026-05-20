import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MuxLiveStatusCard } from "@/components/streaming/MuxLiveStatusCard";
import type { MuxStreamSignalState } from "@/lib/muxStreamStatus";
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
  /** Estado actualizado por el padre (polling cada ~4 s). */
  signal: MuxStreamSignalState;
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

/** Panel OBS/RTMP: credenciales Mux + tarjeta de estado (sin reproductor web). */
export function MuxObsEmitterPanel({ credentials, signal, onEndSession, className }: MuxObsEmitterPanelProps) {
  return (
    <div className={cn("space-y-5", className)}>
      <MuxLiveStatusCard
        signal={signal}
        playbackUrl={credentials.playbackUrl}
        playbackId={credentials.playbackId}
      />

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

      {onEndSession ? (
        <Button type="button" variant="outline" className="w-full border-rose-400/50 text-rose-100" onClick={onEndSession}>
          Cerrar sesión Live
        </Button>
      ) : null}
    </div>
  );
}
