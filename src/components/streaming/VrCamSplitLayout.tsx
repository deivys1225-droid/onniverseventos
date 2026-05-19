import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type VrCamSplitLayoutProps = {
  streamPanel: ReactNode;
  onClose: () => void;
  className?: string;
};

/** Pantalla completa 50/50: transmisiÃ³n (izq) + cÃ¡mara local (der). */
export function VrCamSplitLayout({ streamPanel, onClose, className }: VrCamSplitLayoutProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const startCamera = async () => {
      try {
        setCameraError(null);
        const media = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
        if (cancelled) {
          media.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = media;
        if (videoRef.current) {
          videoRef.current.srcObject = media;
          await videoRef.current.play();
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "No se pudo abrir la cÃ¡mara.";
        setCameraError(msg);
      }
    };

    void startCamera();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div
      className={cn("fixed inset-0 z-40 flex flex-col bg-black pt-16", className)}
      role="dialog"
      aria-label="vrcam â€” pantalla dividida"
    >
      <div className="grid min-h-0 flex-1 grid-cols-2 divide-x divide-cyan-500/30">
        <div className="relative flex min-h-0 min-w-0 flex-col overflow-hidden bg-black">
          <p className="absolute left-2 top-2 z-10 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-200">
            Live
          </p>
          <div className="flex min-h-0 flex-1 items-center justify-center p-1">{streamPanel}</div>
        </div>
        <div className="relative flex min-h-0 min-w-0 flex-col overflow-hidden bg-black">
          <p className="absolute left-2 top-2 z-10 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-200">
            CÃ¡mara
          </p>
          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
          {cameraError && (
            <p className="absolute inset-0 flex items-center justify-center bg-black/80 p-4 text-center text-sm text-destructive">
              {cameraError}
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-center border-t border-cyan-500/25 bg-black/90 px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-cyan-400/50 bg-cyan-500/15 px-6 py-2.5 text-sm font-semibold tracking-wide text-cyan-50 hover:bg-cyan-500/25"
        >
          <X className="h-4 w-4" aria-hidden />
          Salir de vrcam
        </button>
      </div>
    </div>
  );
}

