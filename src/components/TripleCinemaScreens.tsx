import CinemaScreenOnePhone from "@/components/CinemaScreenOnePhone";
import CinemaScreenThreeWebsite from "@/components/CinemaScreenThreeWebsite";
import CinemaScreenTwoEvents from "@/components/CinemaScreenTwoEvents";
import { useCameraBackground } from "@/contexts/CameraBackgroundContext";
import { MegaCineSplitProvider } from "@/contexts/MegaCineSplitContext";
import { Columns2, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { cn } from "@/lib/utils";

/** Sala Mega Cine: fondo 2D fijo + 3 pantallas negras (sin WebGL). */
const SCREENS = [
  { id: 1, title: "Pantalla 1", phone: true, events: false, website: false },
  { id: 2, title: "Pantalla 2", phone: false, events: true, website: false },
  { id: 3, title: "Pantalla 3", phone: false, events: false, website: true },
] as const;

/** Recorte: mitad derecha de la escena (200% ancho + desplazamiento). */
const RIGHT_HALF_CLIP_CLASS = "h-full w-[200%] min-w-[200%] max-w-none -ml-[100%]";

function MegaCineScene() {
  const { cameraBgActive } = useCameraBackground();

  return (
    <div
      data-camera-page-section
      data-mega-cine-scene
      className={cn(
        "absolute inset-0 z-10 min-w-full overflow-hidden",
        cameraBgActive ? "bg-transparent" : "bg-[#f2f0ec]",
      )}
    >
      <div
        data-camera-decorative-bg
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#f7f5f1] via-[#f2f0ec] to-[#e8e4dc]"
        aria-hidden
      />
      <div
        data-camera-decorative-bg
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-t from-[#ddd8cf]/80 to-transparent"
        aria-hidden
      />

      <div className="relative z-10 flex h-full w-full min-w-[min(100%,1200px)] flex-col items-center justify-center px-3 pb-28 pt-6 sm:px-6 md:px-10">
        <div className="grid w-full max-w-[1200px] grid-cols-1 items-end justify-items-center gap-6 md:grid-cols-3 md:gap-5 lg:gap-8">
          {SCREENS.map((screen) => (
            <article
              key={screen.id}
              className="relative z-10 w-full max-w-[min(100%,340px)]"
            >
              <div className="rounded-sm border-[3px] border-[#1a1a1a] bg-[#050505] p-1 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.45),0_0_0_1px_rgba(0,0,0,0.15)]">
                <div
                  data-cinema-screen={screen.id}
                  className={cn(
                    "relative w-full overflow-hidden rounded-[2px] bg-black",
                    screen.phone ? "aspect-[4/3] min-h-[220px] sm:min-h-[260px]" : "aspect-video",
                  )}
                  role={screen.phone || screen.website ? undefined : "img"}
                  aria-label={screen.title}
                >
                  {screen.phone ? (
                    <CinemaScreenOnePhone />
                  ) : screen.events ? (
                    <CinemaScreenTwoEvents />
                  ) : screen.website ? (
                    <CinemaScreenThreeWebsite />
                  ) : (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-br from-[#0d0d0d] via-black to-[#141414]" />
                      <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-white/[0.06] to-transparent" />
                    </>
                  )}
                </div>
              </div>
              <p className="mt-2 text-center font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {screen.title}
              </p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

type CaptureCapableElement = HTMLElement & {
  captureStream?: (frameRate?: number) => MediaStream;
};

/** Espejo en vivo: copia los píxeles del panel derecho (sin segunda carga de red). */
function useLivePanelMirror(
  sourceRef: RefObject<HTMLDivElement | null>,
  mirrorVideoRef: RefObject<HTMLVideoElement | null>,
) {
  const [mirrorReady, setMirrorReady] = useState(false);

  useEffect(() => {
    const source = sourceRef.current as CaptureCapableElement | null;
    const mirrorVideo = mirrorVideoRef.current;
    if (!source || !mirrorVideo) return;

    let stream: MediaStream | null = null;
    let cancelled = false;

    const attach = async () => {
      if (typeof source.captureStream !== "function") {
        setMirrorReady(false);
        return;
      }

      try {
        stream = source.captureStream(30);
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        mirrorVideo.srcObject = stream;
        mirrorVideo.muted = true;
        await mirrorVideo.play();
        setMirrorReady(true);
      } catch {
        setMirrorReady(false);
      }
    };

    void attach();

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
      mirrorVideo.srcObject = null;
      setMirrorReady(false);
    };
  }, [mirrorVideoRef, sourceRef]);

  return mirrorReady;
}

function SplitMegaCineView() {
  const masterRef = useRef<HTMLDivElement>(null);
  const mirrorVideoRef = useRef<HTMLVideoElement>(null);
  const mirrorReady = useLivePanelMirror(masterRef, mirrorVideoRef);

  return (
    <div className="absolute inset-0 flex">
      {/* Izquierda: reflejo en vivo del panel derecho (un solo render, sin red extra) */}
      <div className="relative h-full w-1/2 shrink-0 overflow-hidden bg-[#f2f0ec]">
        <video
          ref={mirrorVideoRef}
          className={cn(
            "pointer-events-none absolute inset-0 h-full w-full object-cover object-center",
            !mirrorReady && "opacity-0",
          )}
          playsInline
          muted
          aria-hidden
        />
        {!mirrorReady && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-center text-[10px] text-slate-500">
            Preparando reflejo…
          </p>
        )}
      </div>

      {/* Derecha: original única (interactiva) */}
      <div className="relative h-full w-1/2 shrink-0 overflow-hidden border-l-2 border-cyan-500/50">
        <div ref={masterRef} className={RIGHT_HALF_CLIP_CLASS}>
          <MegaCineScene />
        </div>
      </div>
    </div>
  );
}

export default function TripleCinemaScreens() {
  const [splitVertical, setSplitVertical] = useState(false);

  return (
    <>
      {splitVertical ? <SplitMegaCineView /> : <MegaCineScene />}

      <button
        type="button"
        onClick={() => setSplitVertical((v) => !v)}
        className="pointer-events-auto fixed right-4 top-4 z-[80] inline-flex items-center gap-2 rounded-full border border-cyan-500/50 bg-slate-950/90 px-3 py-2 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-cyan-100 shadow-[0_0_24px_-4px_rgba(34,211,238,0.7)] backdrop-blur-md hover:border-cyan-300 md:text-xs"
        aria-pressed={splitVertical}
      >
        {splitVertical ? (
          <>
            <Square className="h-4 w-4" aria-hidden />
            Vista completa
          </>
        ) : (
          <>
            <Columns2 className="h-4 w-4" aria-hidden />
            Dividir 50/50
          </>
        )}
      </button>
    </>
  );
}
