import { useCallback, useEffect, useState } from "react";
import { EnableVideoIcon, StopIcon } from "@livepeer/react/assets";
import * as Broadcast from "@livepeer/react/broadcast";
import { getIngest } from "@livepeer/react/external";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";
import { cn } from "@/lib/utils";

type LivepeerBroadcastPanelProps = {
  streamKey: string;
  title?: string;
  className?: string;
  onLive?: () => void;
  onStopped?: () => void;
  onError?: (message: string) => void;
};

/** Notifica cuando el broadcast entra en estado LIVE (solo monta el hijo en ese estado). */
function LiveReporter({ onLive }: { onLive?: () => void }) {
  useEffect(() => {
    onLive?.();
  }, [onLive]);
  return null;
}

/** Notifica cuando el broadcast vuelve a idle (usuario detuvo). */
function StoppedReporter({ onStopped }: { onStopped?: () => void }) {
  useEffect(() => {
    onStopped?.();
  }, [onStopped]);
  return null;
}

export function LivepeerBroadcastPanel({
  streamKey,
  title = "Transmisión en vivo",
  className,
  onLive,
  onStopped,
  onError,
}: LivepeerBroadcastPanelProps) {
  const ingestUrl = streamKey.trim() ? getIngest(streamKey.trim()) : null;
  const [statusLabel, setStatusLabel] = useState("Listo para transmitir");

  const handleError = useCallback(
    (err: unknown) => {
      const message = err instanceof Error ? err.message : "Error en la transmisión Livepeer.";
      onError?.(message);
    },
    [onError],
  );

  if (!ingestUrl) {
    return (
      <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
        Falta stream key de Livepeer.
      </p>
    );
  }

  return (
    <Broadcast.Root
      ingestUrl={ingestUrl}
      aspectRatio={16 / 9}
      onError={handleError}
      className={cn("w-full", className)}
    >
      <Broadcast.Container className="relative aspect-video w-full overflow-hidden rounded-2xl border border-cyan-300/40 bg-black shadow-[0_0_40px_-10px_rgba(34,211,238,0.85)]">
        <Broadcast.Video title={title} className="h-full w-full object-cover" />

        <Broadcast.LoadingIndicator className="pointer-events-none absolute left-3 top-3 z-10">
          <Broadcast.StatusIndicator
            matcher="live"
            className="flex items-center gap-2 rounded-full bg-black/60 px-2.5 py-1 backdrop-blur"
          >
            <LiveReporter onLive={onLive} />
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-red-200">En vivo</span>
          </Broadcast.StatusIndicator>

          <Broadcast.StatusIndicator
            matcher="pending"
            className="flex items-center gap-2 rounded-full bg-black/60 px-2.5 py-1 backdrop-blur"
            onPointerEnter={() => setStatusLabel("Conectando WebRTC…")}
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-300" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-100">
              Conectando
            </span>
          </Broadcast.StatusIndicator>

          <Broadcast.StatusIndicator
            matcher="idle"
            className="flex items-center gap-2 rounded-full bg-black/60 px-2.5 py-1 backdrop-blur"
          >
            <StoppedReporter onStopped={onStopped} />
            <span className="h-2 w-2 rounded-full bg-cyan-200/80" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-100">
              Listo
            </span>
          </Broadcast.StatusIndicator>
        </Broadcast.LoadingIndicator>

        <Broadcast.ErrorIndicator
          matcher="all"
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 p-4 text-center text-sm text-destructive"
        />

        <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 pt-10">
          <Broadcast.Controls className="flex flex-wrap items-center justify-center gap-2">
            <Broadcast.EnabledTrigger
              type="button"
              className="inline-flex min-h-11 min-w-[11rem] items-center justify-center gap-2 rounded-xl border border-cyan-400/60 bg-cyan-500/25 px-5 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-500/40"
            >
              <Broadcast.EnabledIndicator matcher={false} className="contents">
                <EnableVideoIcon className="h-5 w-5" />
                <span>Iniciar transmisión</span>
              </Broadcast.EnabledIndicator>
              <Broadcast.EnabledIndicator matcher className="contents">
                <StopIcon className="h-5 w-5" />
                <span>Detener transmisión</span>
              </Broadcast.EnabledIndicator>
            </Broadcast.EnabledTrigger>

            <Broadcast.VideoEnabledTrigger
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-400/35 bg-black/40 text-cyan-100 hover:bg-cyan-500/20"
              title="Cámara"
            >
              <Broadcast.VideoEnabledIndicator matcher={false}>
                <VideoOff className="h-4 w-4" />
              </Broadcast.VideoEnabledIndicator>
              <Broadcast.VideoEnabledIndicator matcher>
                <Video className="h-4 w-4" />
              </Broadcast.VideoEnabledIndicator>
            </Broadcast.VideoEnabledTrigger>

            <Broadcast.AudioEnabledTrigger
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-400/35 bg-black/40 text-cyan-100 hover:bg-cyan-500/20"
              title="Micrófono"
            >
              <Broadcast.AudioEnabledIndicator matcher={false}>
                <MicOff className="h-4 w-4" />
              </Broadcast.AudioEnabledIndicator>
              <Broadcast.AudioEnabledIndicator matcher>
                <Mic className="h-4 w-4" />
              </Broadcast.AudioEnabledIndicator>
            </Broadcast.AudioEnabledTrigger>
          </Broadcast.Controls>
        </div>
      </Broadcast.Container>

      <p className="mt-2 text-center text-xs text-muted-foreground">{statusLabel}</p>
    </Broadcast.Root>
  );
}
