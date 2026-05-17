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
import { shouldOfferMobileCameraBackground } from "@/lib/deviceDetection";

type CameraBackgroundContextValue = {
  cameraBgActive: boolean;
  toggleCameraBackground: () => void;
};

const CameraBackgroundContext = createContext<CameraBackgroundContextValue | null>(null);

type CameraPermissionState = "granted" | "prompt" | "denied" | "unsupported";

async function queryCameraPermission(): Promise<CameraPermissionState> {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) {
    return "unsupported";
  }
  try {
    const result = await navigator.permissions.query({ name: "camera" as PermissionName });
    if (result.state === "granted") return "granted";
    if (result.state === "denied") return "denied";
    return "prompt";
  } catch {
    return "unsupported";
  }
}

function getCameraErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    switch (error.name) {
      case "NotAllowedError":
      case "PermissionDeniedError":
        return "Permiso de cámara denegado. En el navegador del celular, abre el menú (candado o ⋮) y permite el acceso a la cámara.";
      case "NotFoundError":
      case "DevicesNotFoundError":
        return "No se encontró una cámara en este dispositivo.";
      case "NotReadableError":
      case "TrackStartError":
        return "La cámara está en uso por otra aplicación. Ciérrala e inténtalo de nuevo.";
      case "SecurityError":
        return "La cámara requiere una conexión segura (HTTPS).";
      case "OverconstrainedError":
        return "No se pudo iniciar la cámara con la configuración solicitada.";
      default:
        break;
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return "No se pudo activar la cámara. Revisa los permisos en Ajustes del celular.";
}

export function useCameraBackground(): CameraBackgroundContextValue {
  const ctx = useContext(CameraBackgroundContext);
  if (!ctx) {
    throw new Error("useCameraBackground debe usarse dentro de CameraBackgroundProvider");
  }
  return ctx;
}

export function CameraToggleButton({ className }: { className?: string }) {
  const { cameraBgActive, toggleCameraBackground } = useCameraBackground();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(shouldOfferMobileCameraBackground());
  }, []);

  if (!visible) return null;

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
    if (!shouldOfferMobileCameraBackground()) {
      toast.error("La cámara de fondo solo está disponible en el celular.");
      return;
    }
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast.error("La cámara no está disponible en este dispositivo.");
      return;
    }

    const permission = await queryCameraPermission();
    if (permission === "denied") {
      toast.error(
        "Permiso de cámara bloqueado. En Ajustes del celular o del navegador, permite el acceso a la cámara para este sitio.",
      );
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
      toast.error(getCameraErrorMessage(error));
    }
  }, []);

  const toggleCameraBackground = useCallback(() => {
    if (!shouldOfferMobileCameraBackground()) return;
    if (cameraBgActive) stopCameraBackground();
    else void startCameraBackground();
  }, [cameraBgActive, startCameraBackground, stopCameraBackground]);

  useEffect(() => {
    if (!shouldOfferMobileCameraBackground() && cameraBgActive) {
      stopCameraBackground();
    }
  }, [cameraBgActive, stopCameraBackground]);

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
