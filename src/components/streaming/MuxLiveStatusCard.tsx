import { Radio, Smartphone } from "lucide-react";
import { openMuxLiveInAndroidSelector, isAndroidLiveSelectorAvailable } from "@/lib/androidAgoraRoomEntry";
import type { MuxStreamSignalState } from "@/lib/muxStreamStatus";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type MuxLiveStatusCardProps = {
  signal: MuxStreamSignalState;
  playbackUrl: string;
  playbackId: string;
  onSignalBecameActive?: () => void;
  className?: string;
};

/**
 * Tarjeta de estado Live (sin <video> ni MuxPlayer).
 * Clic solo cuando está iluminada → Intent Android con .m3u8.
 */
export function MuxLiveStatusCard({
  signal,
  playbackUrl,
  playbackId,
  className,
}: MuxLiveStatusCardProps) {
  const isLive = signal === "active";
  const waiting = signal === "idle" || signal === "checking";
  const isAndroid = isAndroidLiveSelectorAvailable();

  const handleClick = () => {
    if (!isLive) return;

    const ok = openMuxLiveInAndroidSelector({ playbackUrl, playbackId });
    if (ok) {
      toast.success("Abriendo SelectorActivity con el stream HLS…");
      return;
    }
    toast.error("Usa la app Android (APK) para abrir el selector 360 / Mixta / Inmersiva.");
  };

  return (
    <button
      type="button"
      disabled={!isLive}
      onClick={handleClick}
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border px-5 py-4 text-left transition-all duration-300",
        isLive
          ? "cursor-pointer border-red-400/70 bg-gradient-to-r from-red-600/25 via-red-500/15 to-rose-600/20 shadow-[0_0_32px_-4px_rgba(239,68,68,0.75)] ring-2 ring-red-400/40 hover:shadow-[0_0_40px_rgba(239,68,68,0.9)]"
          : waiting
            ? "cursor-default border-amber-400/45 bg-amber-500/10"
            : "cursor-default border-destructive/40 bg-destructive/10",
        className,
      )}
    >
      {isLive && (
        <span
          className="pointer-events-none absolute inset-0 animate-pulse bg-gradient-to-r from-red-500/10 via-transparent to-red-500/10"
          aria-hidden
        />
      )}

      <div className="relative flex items-center gap-3">
        <span
          className={cn(
            "h-4 w-4 shrink-0 rounded-full",
            isLive
              ? "animate-pulse bg-red-500 shadow-[0_0_14px_rgba(239,68,68,1)]"
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
              ? isAndroid
                ? "Toca para abrir SelectorActivity (sin reproductor web)."
                : "Señal Mux activa. Abre la app Android para ver el stream."
              : "Conecta OBS con la URL RTMP del panel Live."}
          </p>
        </div>
        {isLive ? (
          <Smartphone className="h-6 w-6 shrink-0 text-red-300" aria-hidden />
        ) : (
          <Radio className="h-5 w-5 shrink-0 text-amber-300" aria-hidden />
        )}
      </div>
    </button>
  );
}
