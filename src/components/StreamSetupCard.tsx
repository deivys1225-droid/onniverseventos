import { useEffect, useMemo, useRef, useState } from "react";
import { Radio, Video, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PayPalButtons } from "@paypal/react-paypal-js";

export type StreamSetupPayload = {
  title: string;
  streamUrl: string;
  category: "Musica" | "Educacion" | "Deporte" | "Social";
  privacy: "publico" | "privado_ticket";
  sourceMode: "pro" | "celular";
  cameraActive: boolean;
  ticketPrice: number | null;
};

type StreamSetupCardProps = {
  isSubmitting?: boolean;
  onSubmit: (payload: StreamSetupPayload) => Promise<void> | void;
  onStopLive?: () => Promise<void> | void;
  isLive?: boolean;
  onClose?: () => void;
  onCameraStreamChange?: (stream: MediaStream | null) => void;
};

const StreamSetupCard = ({
  isSubmitting = false,
  onSubmit,
  onStopLive,
  isLive = false,
  onClose,
  onCameraStreamChange,
}: StreamSetupCardProps) => {
  const [title, setTitle] = useState("");
  const [streamUrl, setStreamUrl] = useState("");
  const [category, setCategory] = useState<"Musica" | "Educacion" | "Deporte" | "Social">("Musica");
  const [privacy, setPrivacy] = useState<"publico" | "privado_ticket">("publico");
  const [ticketPrice, setTicketPrice] = useState("");
  const [sourceMode, setSourceMode] = useState<"pro" | "celular">("pro");
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("user");
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);

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
  const parsedTicket = Number(ticketPrice);
  const validTicket = Number.isFinite(parsedTicket) && parsedTicket > 0;
  const canSubmit =
    title.trim().length >= 3 &&
    (sourceMode === "pro" ? urlValid : cameraActive) &&
    (privacy === "privado_ticket" ? validTicket : true) &&
    !isSubmitting;

  useEffect(() => {
    onCameraStreamChange?.(cameraStream);
  }, [cameraStream, onCameraStreamChange]);

  useEffect(() => {
    const el = previewVideoRef.current;
    if (!el) return;
    el.srcObject = cameraStream;
    if (cameraStream) void el.play().catch(() => undefined);
  }, [cameraStream]);

  useEffect(() => {
    return () => {
      if (!isLive) {
        onCameraStreamChange?.(null);
        cameraStream?.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream, isLive, onCameraStreamChange]);

  const enableCamera = async (facing: "user" | "environment" = cameraFacing) => {
    setCameraError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Este dispositivo no soporta camara web. Abre el sitio en HTTPS (Vercel) y usa Chrome o Safari.");
      return;
    }
    try {
      cameraStream?.getTracks().forEach((track) => track.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing },
        audio: true,
      });
      setCameraFacing(facing);
      setCameraStream(stream);
    } catch (error) {
      setCameraError(error instanceof Error ? error.message : "No se pudo activar camara/microfono.");
    }
  };

  const flipCamera = async () => {
    const next = cameraFacing === "user" ? "environment" : "user";
    if (cameraStream) await enableCamera(next);
    else setCameraFacing(next);
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
            <p className="text-xs text-muted-foreground">Configura tu live en OnniVers.</p>
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
          <span className="rounded-md bg-cyan-500/35 px-3 py-1 text-xs text-cyan-50">Modo Pro</span>
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
            <p className="text-[11px] leading-snug text-muted-foreground">
              Este flujo heredado quedó desactivado. Usa el módulo principal de Agora para iniciar streaming.
            </p>
            {!cameraActive ? (
              <Button type="button" variant="outline" className="w-full" onClick={() => void enableCamera()} disabled={isSubmitting}>
                Activar camara y microfono
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={disableCamera} disabled={isSubmitting}>
                  Desactivar camara
                </Button>
                <Button type="button" variant="outline" className="flex-1 shrink-0 px-2 text-xs" onClick={() => void flipCamera()} disabled={isSubmitting}>
                  Cambiar camara
                </Button>
              </div>
            )}
            <div className="overflow-hidden rounded-lg border border-cyan-300/35 bg-black/40">
              <video ref={previewVideoRef} autoPlay playsInline muted className="aspect-video w-full object-cover" />
            </div>
            <p className={`text-[11px] ${cameraActive ? "text-emerald-300" : cameraError ? "text-rose-300" : "text-amber-300"}`}>
              {cameraActive ? "Listo para emitir." : cameraError || "Activa la camara (permite permisos del navegador)."}
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

        {privacy === "privado_ticket" && (
          <div className="space-y-2 rounded-xl border border-amber-300/35 bg-amber-300/10 p-2.5">
            <Input
              type="number"
              min={1}
              step="0.01"
              value={ticketPrice}
              onChange={(e) => {
                setTicketPrice(e.target.value);
              }}
              onBlur={() => {
                const value = Number(ticketPrice);
                if (Number.isFinite(value) && value > 0) {
                  setTicketPrice(value.toFixed(2));
                }
              }}
              placeholder="Ejemplo: 9.00 USD"
              className="border-amber-300/45 bg-black/25"
              disabled={isSubmitting}
            />
            {validTicket ? (
              <div className="rounded-lg border border-[#ffc439]/50 bg-[#ffc439]/10 p-2">
                <PayPalButtons
                  style={{ layout: "vertical", color: "gold", shape: "rect", label: "pay", height: 42 }}
                  forceReRender={[ticketPrice]}
                  createOrder={(_data, actions) =>
                    actions.order.create({
                      intent: "CAPTURE",
                      purchase_units: [
                        {
                          amount: { currency_code: "USD", value: parsedTicket.toFixed(2) },
                          description: `Ticket VIP Live - ${title || "OnniVers"}`,
                        },
                      ],
                    })
                  }
                  onApprove={async (_data, actions) => {
                    if (!actions.order) return;
                    await actions.order.capture();
                  }}
                />
              </div>
            ) : (
              <p className="text-[11px] text-amber-200">Ingresa un valor valido con centavos (ejemplo: 5.00).</p>
            )}
          </div>
        )}

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
              ticketPrice: privacy === "privado_ticket" ? parsedTicket : null,
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
    </div>
  );
};

export default StreamSetupCard;
