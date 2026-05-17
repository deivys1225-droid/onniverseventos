import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Camera } from "lucide-react";
import { toast } from "sonner";

type CameraBackgroundContextValue = {
  cameraBgActive: boolean;
  toggleCameraBackground: () => void;
};

const CameraBackgroundContext = createContext<CameraBackgroundContextValue | null>(null);

export function useCameraBackground(): CameraBackgroundContextValue {
  const ctx = useContext(CameraBackgroundContext);
  if (!ctx) {
    throw new Error("useCameraBackground debe usarse dentro de CameraBackgroundProvider");
  }
  return ctx;
}

export function CameraToggleButton({ className }: { className?: string }) {
  const { cameraBgActive, toggleCameraBackground } = useCameraBackground();

  return (
    <div
      className={
        className ??
        "pointer-events-none fixed bottom-4 right-4 z-[80] pb-[env(safe-area-inset-bottom,0px)] pr-[env(safe-area-inset-right,0px)]"
      }
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void toggleCameraBackground();
        }}
        aria-label={cameraBgActive ? "Apagar cámara de fondo" : "Activar cámara de fondo"}
        aria-pressed={cameraBgActive}
        className={`pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full border transition ${
          cameraBgActive
            ? "border-yellow-200 bg-yellow-400 text-yellow-950 shadow-[0_0_32px_-2px_rgba(250,204,21,1),inset_0_0_16px_-8px_rgba(253,224,71,0.8)]"
            : "border-yellow-500/80 bg-yellow-500 text-yellow-950 shadow-[0_0_24px_-4px_rgba(234,179,8,0.9)] hover:border-yellow-300 hover:bg-yellow-400"
        }`}
      >
        <Camera className="h-5 w-5" />
      </button>
    </div>
  );
}

export function CameraBackgroundProvider({ children }: { children: ReactNode }) {
  const [cameraBgActive, setCameraBgActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("camera-bg-active", cameraBgActive);
    return () => document.documentElement.classList.remove("camera-bg-active");
  }, [cameraBgActive]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.srcObject = cameraStream;
    if (cameraStream) void el.play().catch(() => undefined);
  }, [cameraStream]);

  useEffect(() => {
    return () => {
      cameraStream?.getTracks().forEach((track) => track.stop());
    };
  }, [cameraStream]);

  const stopCameraBackground = useCallback(() => {
    setCameraStream((prev) => {
      prev?.getTracks().forEach((track) => track.stop());
      return null;
    });
    setCameraBgActive(false);
  }, []);

  const startCameraBackground = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast.error("La cámara no está disponible en este dispositivo.");
      return;
    }
    try {
      setCameraStream((prev) => {
        prev?.getTracks().forEach((track) => track.stop());
        return null;
      });
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      setCameraStream(stream);
      setCameraBgActive(true);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo activar la cámara. Revisa los permisos del navegador.",
      );
    }
  }, []);

  const toggleCameraBackground = useCallback(() => {
    if (cameraBgActive) stopCameraBackground();
    else void startCameraBackground();
  }, [cameraBgActive, startCameraBackground, stopCameraBackground]);

  return (
    <CameraBackgroundContext.Provider value={{ cameraBgActive, toggleCameraBackground }}>
      {cameraBgActive && cameraStream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0 h-full w-full object-cover object-center"
        />
      ) : null}
      <div className="relative z-10">{children}</div>
    </CameraBackgroundContext.Provider>
  );
}
