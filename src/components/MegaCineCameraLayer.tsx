import { useCameraBackground } from "@/contexts/CameraBackgroundContext";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

type MegaCineCameraLayerProps = {
  /** Mismo recorte que la escena en modo 50/50 (mitad derecha). */
  clipClassName?: string;
};

/** Cámara de fondo dentro de Mega Cine (vista completa o mitad dividida). */
export default function MegaCineCameraLayer({ clipClassName }: MegaCineCameraLayerProps) {
  const { cameraBgActive, cameraStream } = useCameraBackground();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.srcObject = cameraStream;
    if (cameraStream) void el.play().catch(() => undefined);
  }, [cameraStream]);

  if (!cameraBgActive || !cameraStream) return null;

  const video = (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
    />
  );

  if (!clipClassName) {
    return <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">{video}</div>;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div className={cn("absolute inset-0", clipClassName)}>{video}</div>
    </div>
  );
}
