import ColiseoImmersiveScene from "@/components/immersive/ColiseoImmersiveScene";
import { ArrowLeft, Camera, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const ColiseoPage = () => {
  const navigate = useNavigate();
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraBackgroundRef = useRef<HTMLVideoElement | null>(null);

  const stopCamera = useCallback(() => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    setCameraStream(null);
    setCameraReady(false);
    setCameraEnabled(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  useEffect(() => {
    const el = cameraBackgroundRef.current;
    if (!el) return;
    el.srcObject = cameraStream;
    if (!cameraStream) {
      setCameraReady(false);
      return;
    }
    setCameraReady(false);
    const onCanPlay = () => {
      setCameraReady(true);
      void el.play().catch(() => undefined);
    };
    el.addEventListener("loadeddata", onCanPlay);
    el.addEventListener("canplay", onCanPlay);
    void el.play().catch(() => undefined);
    return () => {
      el.removeEventListener("loadeddata", onCanPlay);
      el.removeEventListener("canplay", onCanPlay);
    };
  }, [cameraStream]);

  const toggleCamera = useCallback(async () => {
    if (cameraBusy) return;
    if (cameraEnabled) {
      stopCamera();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Este dispositivo no soporta camara web.");
      return;
    }
    setCameraBusy(true);
    setCameraError(null);
    setCameraReady(false);
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
          },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      cameraStreamRef.current = stream;
      setCameraStream(stream);
      setCameraEnabled(true);
    } catch (error) {
      setCameraError(error instanceof Error ? error.message : "No se pudo activar la camara.");
      stopCamera();
    } finally {
      setCameraBusy(false);
    }
  }, [cameraBusy, cameraEnabled, stopCamera]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => navigate("/docente-clases")}
        aria-label="Volver"
        className="fixed left-4 top-4 z-30 inline-flex h-11 w-11 items-center justify-center rounded-full border border-cyan-400/60 bg-slate-950/95 text-cyan-200 shadow-[0_0_28px_-4px_rgba(34,211,238,0.95),inset_0_0_18px_-10px_rgba(34,211,238,0.55)] backdrop-blur-md transition hover:border-cyan-300 hover:bg-slate-900 hover:text-white"
        style={{
          top: "max(1rem, env(safe-area-inset-top))",
          left: "max(1rem, env(safe-area-inset-left))",
        }}
      >
        <ArrowLeft className="h-5 w-5" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => void toggleCamera()}
        aria-label={cameraEnabled ? "Desactivar camara" : "Activar camara"}
        title={cameraEnabled ? "Camara activa" : "Activar camara"}
        className={`fixed right-4 top-4 z-30 inline-flex h-11 w-11 items-center justify-center rounded-full border bg-slate-950/95 backdrop-blur-md transition ${
          cameraEnabled
            ? "border-emerald-400/70 text-emerald-200 shadow-[0_0_24px_-6px_rgba(16,185,129,0.85)] hover:border-emerald-300 hover:text-white"
            : "border-cyan-400/60 text-cyan-200 shadow-[0_0_28px_-4px_rgba(34,211,238,0.95),inset_0_0_18px_-10px_rgba(34,211,238,0.55)] hover:border-cyan-300 hover:bg-slate-900 hover:text-white"
        }`}
        style={{
          top: "max(1rem, env(safe-area-inset-top))",
          right: "max(1rem, env(safe-area-inset-right))",
        }}
      >
        {cameraBusy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Camera className="h-5 w-5" aria-hidden />}
      </button>
      {cameraError && (
        <p className="pointer-events-none fixed right-4 top-16 z-30 max-w-[min(86vw,320px)] rounded-md border border-rose-400/40 bg-black/75 px-3 py-2 text-[11px] text-rose-200 backdrop-blur-sm">
          {cameraError}
        </p>
      )}
      <video
        ref={cameraBackgroundRef}
        playsInline
        autoPlay
        muted
        aria-hidden
        style={
          cameraEnabled && cameraStream && cameraReady
            ? {
                position: "fixed",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                zIndex: 0,
                pointerEvents: "none",
              }
            : {
                position: "fixed",
                width: 1,
                height: 1,
                opacity: 0,
                pointerEvents: "none",
                overflow: "hidden",
              }
        }
      />
      <ColiseoImmersiveScene mixedRealityActive={Boolean(cameraEnabled && cameraStream && cameraReady)} />
    </div>
  );
};

export default ColiseoPage;
