import { useState } from "react";
import { MonitorPlay, Radio, Smartphone, Video } from "lucide-react";
import type { MuxStreamSignalState } from "@/lib/muxStreamStatus";
import { cn } from "@/lib/utils";
import { invokeOpenStreamDirect, resolveMuxM3u8FromPlayback } from "@/lib/liveStreamOpenDirect";
import { toast } from "sonner";

type MuxLiveStatusCardProps = {
  signal: MuxStreamSignalState;
  playbackUrl: string;
  playbackId: string;
  onSignalBecameActive?: () => void;
  className?: string;
};

/** Tarjeta EN VIVO (ámbar): elige STREAM o STREAM CAM → AndroidBridge.openStreamDirect */
export function MuxLiveStatusCard({
  signal,
  playbackUrl,
  playbackId,
  className,
}: MuxLiveStatusCardProps) {
  const isLive = signal === "active";
  const waiting = signal === "idle" || signal === "checking";
  const [showStreamChoices, setShowStreamChoices] = useState(false);

  const m3u8Url = resolveMuxM3u8FromPlayback(playbackUrl, playbackId);

  const openStreamDirect = (action: "OPEN_STREAM" | "OPEN_STREAM_CAM") => {
    if (!m3u8Url) {
      toast.error("Falta URL .m3u8 de Mux.");
      return;
    }
    if (invokeOpenStreamDirect(m3u8Url, action)) {
      setShowStreamChoices(false);
    }
  };

  const handleCardClick = () => {
    if (!isLive) return;
    if (!m3u8Url) {
      toast.error("Falta URL .m3u8 de Mux.");
      return;
    }
    setShowStreamChoices(true);
  };

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border transition-all duration-300",
        isLive
          ? "border-amber-300/80 bg-amber-300/10 shadow-[0_0_24px_-8px_rgba(250,204,21,0.95)] ring-2 ring-amber-300/50"
          : waiting
            ? "border-amber-400/45 bg-amber-500/10"
            : "border-destructive/40 bg-destructive/10",
        className,
      )}
    >
      {isLive && (
        <span
          className="pointer-events-none absolute inset-0 animate-pulse bg-gradient-to-r from-amber-400/15 via-transparent to-amber-300/10"
          aria-hidden
        />
      )}

      <button
        type="button"
        disabled={!isLive}
        onClick={handleCardClick}
        className="relative w-full px-5 py-4 text-left disabled:cursor-default"
      >
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "h-4 w-4 shrink-0 rounded-full",
              isLive
                ? "animate-pulse bg-amber-400 shadow-[0_0_14px_rgba(250,204,21,0.95)]"
                : signal === "checking"
                  ? "animate-pulse bg-cyan-400/80"
                  : "bg-amber-400",
            )}
          />
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold tracking-wide text-foreground">
              {isLive ? "EN VIVO" : signal === "checking" ? "Comprobando señal…" : "Esperando señal"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isLive
                ? showStreamChoices
                  ? "Elige modo de reproducción:"
                  : "Toca para elegir STREAM o STREAM CAM"
                : "Conecta OBS con la URL RTMP del panel Live."}
            </p>
          </div>
          {isLive ? (
            <Smartphone className="h-6 w-6 shrink-0 text-amber-300" aria-hidden />
          ) : (
            <Radio className="h-5 w-5 shrink-0 text-amber-300" aria-hidden />
          )}
        </div>
      </button>

      {isLive && showStreamChoices ? (
        <div className="relative flex flex-col gap-2 border-t border-amber-300/40 px-4 pb-4 pt-2">
          <button
            type="button"
            onClick={() => openStreamDirect("OPEN_STREAM")}
            className="flex items-center justify-center gap-2 rounded-xl border border-cyan-400/50 bg-cyan-500/15 px-4 py-3 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-500/25"
          >
            <MonitorPlay className="h-5 w-5 shrink-0" aria-hidden />
            STREAM (Cine)
          </button>
          <button
            type="button"
            onClick={() => openStreamDirect("OPEN_STREAM_CAM")}
            className="flex items-center justify-center gap-2 rounded-xl border border-violet-400/50 bg-violet-500/15 px-4 py-3 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/25"
          >
            <Video className="h-5 w-5 shrink-0" aria-hidden />
            STREAM CAM (Realidad mixta)
          </button>
        </div>
      ) : null}
    </div>
  );
}
