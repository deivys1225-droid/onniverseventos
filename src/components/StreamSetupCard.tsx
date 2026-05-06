import { useEffect, useMemo, useRef, useState } from "react";
import { Radio, Video, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type StreamSetupPayload = {
  title: string;
  streamUrl: string;
  category: "Musica" | "Educacion" | "Deporte" | "Social";
  privacy: "publico" | "privado_ticket";
  sourceMode: "pro" | "celular";
  cameraActive: boolean;
};

type StreamSetupCardProps = {
  isSubmitting?: boolean;
  onSubmit: (payload: StreamSetupPayload) => Promise<void> | void;
  onStopLive?: () => Promise<void> | void;
  isLive?: boolean;
  onClose?: () => void;
};

const StreamSetupCard = ({
  isSubmitting = false,
  onSubmit,
  onStopLive,
  isLive = false,
  onClose,
}: StreamSetupCardProps) => {
  const [title, setTitle] = useState("");
  const [streamUrl, setStreamUrl] = useState("");
  const [category, setCategory] = useState<"Musica" | "Educacion" | "Deporte" | "Social">("Musica");
  const [privacy, setPrivacy] = useState<"publico" | "privado_ticket">("publico");
  const [sourceMode, setSourceMode] = useState<"pro" | "celular">("pro");
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const urlValid = useMemo(() => {
    const raw = streamUrl.trim();
    if (!raw) return false;
    try {
      const u = new URL(raw);
      return ["http:", "https:", "rtmp:", "rtmps:"].includes(u.protocol);
    } catch {
      return false;
    }
  }, [streamUrl]);

  const cameraActive = Boolean(cameraStream);
  const canSubmit =
    title.trim().length >= 3 &&
    (sourceMode === "pro" ? urlValid : cameraActive) &&
    !isSubmitting;

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = cameraStream;
  }, [cameraStream]);

  useEffect(() => {
    return () => {
      cameraStream?.getTracks().forEach((track) => track.stop());
    };
  }, [cameraStream]);

  const enableCamera = async () => {
    setCameraError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Este dispositivo o navegador no soporta camara web (getUserMedia). Usa HTTPS o un navegador actualizado.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: true,
      });
      setCameraStream(stream);
    } catch (error) {
      setCameraError(error instanceof Error ? error.message : "No se pudo activar camara/microfono.");
    }
  };

  const disableCamera = () => {
    cameraStream?.getTracks().forEach((track) => track.stop());
    setCameraStream(null);
  };

  return (
    <div
      className={`relative w-[min(92vw,340px)] rounded-2xl bg-card/85 p-5 shadow-[0_0_45px_-16px_rgba(34,211,238,0.82)] backdrop-blur-xl ${
        cameraActive
          ? "border-2 border-rose-400/80 shadow-[0_0_48px_-12px_rgba(255,70,110,0.95)]"
          : "border border-cyan-300/35"
      }`}
    >
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-cyan-300/40 bg-cyan-400/15 text-cyan-200">
            <Video className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-200">Transmitir</p>
            <p className="text-xs text-muted-foreground">Configura tu live en Onniverso.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {cameraActive && (
            <span className="rounded-full border border-rose-300/55 bg-rose-500/22 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-100">
              REC LIVE
            </span>
          )}
          <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => onClose?.()} aria-label="Cerrar transmitir">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2.5">
        <div className="flex items-center gap-2 rounded-xl border border-cyan-300/30 bg-cyan-400/10 p-2">
          <button
            type="button"
            className={`rounded-md px-3 py-1 text-xs ${sourceMode === "pro" ? "bg-cyan-500/35 text-cyan-50" : "text-cyan-200"}`}
            onClick={() => {
              setSourceMode("pro");
              disableCamera();
            }}
          >
            Modo Pro
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-1 text-xs ${
              sourceMode === "celular" ? "bg-cyan-500/35 text-cyan-50" : "text-cyan-200"
            }`}
            onClick={() => setSourceMode("celular")}
          >
            Live desde Camara
          </button>
        </div>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titulo del Live"
          className="border-cyan-300/35 bg-black/25"
          disabled={isSubmitting}
        />
        {sourceMode === "pro" ? (
          <div>
            <Input
              value={streamUrl}
              onChange={(e) => setStreamUrl(e.target.value)}
              placeholder="Enlace de transmision (URL)"
              className="border-cyan-300/35 bg-black/25"
              disabled={isSubmitting}
            />
            <p className={`mt-1 text-[11px] ${urlValid ? "text-emerald-300" : "text-amber-300"}`}>
              {urlValid ? "Enlace valido" : "URL invalida (usa http/https/rtmp/rtmps)"}
            </p>
          </div>
        ) : (
          <div className="space-y-2 rounded-xl border border-cyan-300/30 bg-black/25 p-2.5">
            {!cameraActive ? (
              <Button type="button" variant="outline" className="w-full" onClick={() => void enableCamera()} disabled={isSubmitting}>
                Activar camara y microfono
              </Button>
            ) : (
              <Button type="button" variant="outline" className="w-full" onClick={disableCamera} disabled={isSubmitting}>
                Desactivar camara
              </Button>
            )}
            <div className="hidden overflow-hidden rounded-lg border border-cyan-300/35 bg-black/40">
              <video ref={videoRef} autoPlay playsInline muted className="h-40 w-full object-cover" />
            </div>
            <p className={`text-[11px] ${cameraActive ? "text-emerald-300" : "text-amber-300"}`}>
              {cameraActive ? "Preview activo de camara." : cameraError || "Activa la camara para previsualizar."}
            </p>
          </div>
        )}
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as "Musica" | "Educacion" | "Deporte" | "Social")}
          className="h-10 w-full rounded-md border border-cyan-300/35 bg-black/25 px-3 text-sm"
          disabled={isSubmitting}
        >
          <option value="Musica">Musica</option>
          <option value="Educacion">Educacion</option>
          <option value="Deporte">Deporte</option>
          <option value="Social">Social</option>
        </select>

        <div className="flex items-center gap-2 rounded-xl border border-cyan-300/30 bg-cyan-400/10 p-2">
          <Radio className="h-4 w-4 text-cyan-200" />
          <button
            type="button"
            className={`rounded-md px-3 py-1 text-xs ${privacy === "publico" ? "bg-cyan-500/35 text-cyan-50" : "text-cyan-200"}`}
            onClick={() => setPrivacy("publico")}
          >
            Publico
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-1 text-xs ${
              privacy === "privado_ticket" ? "bg-cyan-500/35 text-cyan-50" : "text-cyan-200"
            }`}
            onClick={() => setPrivacy("privado_ticket")}
          >
            Privado con Ticket
          </button>
        </div>

        <Button
          type="button"
          disabled={!canSubmit}
          className="w-full border border-cyan-300/40 bg-cyan-500/20 text-cyan-100 shadow-[0_0_24px_-8px_rgba(34,211,238,0.92)] hover:bg-cyan-500/30"
          onClick={() =>
            canSubmit &&
            onSubmit({
              title: title.trim(),
              streamUrl: sourceMode === "pro" ? streamUrl.trim() : "camera://mobile-beta",
              category,
              privacy,
              sourceMode,
              cameraActive,
            })
          }
        >
          {isSubmitting ? "Iniciando..." : "Iniciar Live"}
        </Button>

        {isLive && (
          <Button type="button" variant="outline" className="w-full" onClick={() => void onStopLive?.()}>
            Detener transmision
          </Button>
        )}
      </div>
      {sourceMode === "celular" && cameraActive && (
        <div className="pointer-events-none absolute -right-3 top-12 z-20 w-36 overflow-hidden rounded-lg border border-rose-300/70 bg-black/70 shadow-[0_0_24px_-6px_rgba(255,90,130,0.95)]">
          <video ref={videoRef} autoPlay playsInline muted className="h-24 w-full object-cover" />
        </div>
      )}
    </div>
  );
};

export default StreamSetupCard;
