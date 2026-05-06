import { useEffect, useRef, useState } from "react";
import { Radio } from "lucide-react";
import { getLivePreviewStream, subscribeLivePreview } from "@/lib/livePreviewBus";

const LIVE_ACTIVE_KEY = "onniverso.live.active";

const FloatingLivePreview = () => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [liveActive, setLiveActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => subscribeLivePreview(setStream), []);

  useEffect(() => {
    setLiveActive(localStorage.getItem(LIVE_ACTIVE_KEY) === "1");
    const onStorage = (event: StorageEvent) => {
      if (event.key === LIVE_ACTIVE_KEY) {
        setLiveActive(event.newValue === "1");
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = stream;
  }, [stream]);

  if (!liveActive) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-[90] w-36 overflow-hidden rounded-xl border border-rose-300/70 bg-black/65 shadow-[0_0_28px_-8px_rgba(255,70,110,0.95)] backdrop-blur-xl">
      <div className="flex items-center gap-1 border-b border-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-100">
        <Radio className="h-3 w-3" />
        LIVE
      </div>
      {stream ? (
        <video ref={videoRef} autoPlay playsInline muted className="h-24 w-full object-cover" />
      ) : (
        <div className="flex h-24 items-center justify-center text-[11px] text-rose-100/85">Transmitiendo...</div>
      )}
    </div>
  );
};

export default FloatingLivePreview;
