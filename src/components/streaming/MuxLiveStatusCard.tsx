import { Radio, Smartphone } from "lucide-react";
import { muxPlaybackIdToHlsUrl } from "@/lib/audiencePlayback";
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

/** Tarjeta Live: Android → playStream; Web → /go/:id */
export function MuxLiveStatusCard({
  signal,
  playbackUrl,
  playbackId,
  className,
}: MuxLiveStatusCardProps) {
  const isLive = signal === "active";
  const waiting = signal === "idle" || signal === "checking";

  const handleClick = () => {
    if (!isLive) return;

    const link = playbackUrl.trim() || muxPlaybackIdToHlsUrl(playbackId) || "";
    if (!link) {
      toast.error("Falta URL del stream.");
      return;
    }

    if (typeof window.Android?.playStream !== "function") {
      toast.error("Abre la app Android para ver el live.");
      return;
    }

    window.Android.playStream(link);
  };

  return (
    <button
      type="button"
      disabled={!isLive}
      onClick={handleClick}
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border px-5 py-4 text-left transition-all duration-300",
        isLive
          ? "cursor-pointer border-amber-300/80 bg-amber-300/10 shadow-[0_0_24px_-8px_rgba(250,204,21,0.95)] ring-2 ring-amber-300/50 hover:border-yellow-200/90 hover:shadow-[0_0_32px_rgba(250,204,21,0.85)]"
          : waiting
            ? "cursor-default border-amber-400/45 bg-amber-500/10"
            : "cursor-default border-destructive/40 bg-destructive/10",
        className,
      )}
    >
      {isLive && (
        <span
          className="pointer-events-none absolute inset-0 animate-pulse bg-gradient-to-r from-amber-400/15 via-transparent to-amber-300/10"
          aria-hidden
        />
      )}

      <div className="relative flex items-center gap-3">
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
              ? "Toca para abrir SelectorActivity y reproducir el stream."
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
  );
}
