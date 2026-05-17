import CinemaScreenThreeWebsite from "@/components/CinemaScreenThreeWebsite";
import CinemaScreenTwoEvents from "@/components/CinemaScreenTwoEvents";
import MegaCineCameraLayer from "@/components/MegaCineCameraLayer";
import { useCameraBackground } from "@/contexts/CameraBackgroundContext";
import { MegaCineSplitProvider } from "@/contexts/MegaCineSplitContext";
import { Columns2, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import {
  MEGA_CINE_SCREEN_BASE_MAX_PX,
  MEGA_CINE_SCREEN_TWO_MAX_PX,
  MEGA_CINE_STACK_MAX_PX,
} from "@/config/megaCineScreenSizes";
import { cn } from "@/lib/utils";

/** Sala Mega Cine: pantallas 2 y 3 apiladas (pantalla 1 oculta). */
const SCREENS = [
  { id: 2, title: "Pantalla 2", events: true, website: false },
  { id: 3, title: "Pantalla 3", events: false, website: true },
] as const;

const SPLIT_PANEL_SCENE_STYLE = {
  maxWidth: `min(100%, ${MEGA_CINE_STACK_MAX_PX}px)`,
} as const;

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

      <div className="relative z-10 flex h-full w-full flex-col items-center justify-center px-3 pb-28 pt-6 sm:px-6 md:px-10">
        <div
          className="flex w-full flex-col items-center gap-5 sm:gap-6"
          style={{ maxWidth: `min(100%, ${MEGA_CINE_STACK_MAX_PX}px)` }}
        >
          {SCREENS.map((screen) => (
            <article
              key={screen.id}
              className="relative z-10 w-full"
              style={{
                maxWidth: `min(100%, ${screen.events ? MEGA_CINE_SCREEN_TWO_MAX_PX : MEGA_CINE_SCREEN_BASE_MAX_PX}px)`,
              }}
            >
              <div className="rounded-sm border-[3px] border-[#1a1a1a] bg-[#050505] p-1 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.45),0_0_0_1px_rgba(0,0,0,0.15)]">
                <div
                  data-cinema-screen={screen.id}
                  className="relative aspect-video w-full overflow-hidden rounded-[2px] bg-black"
                  aria-label={screen.title}
                >
                  {screen.events ? <CinemaScreenTwoEvents /> : <CinemaScreenThreeWebsite />}
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

function syncMediaElement(src: HTMLMediaElement, dst: HTMLMediaElement) {
  dst.muted = true;
  if (src.src && dst.src !== src.src) dst.src = src.src;
  if (Math.abs(dst.currentTime - src.currentTime) > 0.12) {
    try {
      dst.currentTime = src.currentTime;
    } catch {
      /* ignore */
    }
  }
  if (src.paused !== dst.paused) {
    if (src.paused) dst.pause();
    else void dst.play().catch(() => undefined);
  }
}

/** Izquierda sigue al panel derecho (maestro). */
function useMirrorFollowMaster(
  masterRef: RefObject<HTMLDivElement | null>,
  mirrorRef: RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    const sync = () => {
      const master = masterRef.current;
      const mirror = mirrorRef.current;
      if (!master || !mirror) return;

      SCREENS.forEach((screen) => {
        const srcRoot = master.querySelector(`[data-cinema-screen="${screen.id}"]`);
        const dstRoot = mirror.querySelector(`[data-cinema-screen="${screen.id}"]`);
        if (!srcRoot || !dstRoot) return;

        const srcMedias = srcRoot.querySelectorAll<HTMLMediaElement>("video, audio");
        const dstMedias = dstRoot.querySelectorAll<HTMLMediaElement>("video, audio");
        srcMedias.forEach((src, i) => {
          const dst = dstMedias[i];
          if (dst) syncMediaElement(src, dst);
        });
      });
    };

    sync();
    const id = window.setInterval(sync, 50);
    return () => window.clearInterval(id);
  }, [masterRef, mirrorRef]);
}

function SplitMegaCineView() {
  const masterRef = useRef<HTMLDivElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);

  useMirrorFollowMaster(masterRef, mirrorRef);

  return (
    <MegaCineSplitProvider>
      <div className="absolute inset-0 flex">
        <div className="relative flex h-full w-1/2 shrink-0 items-center justify-center overflow-hidden">
          <MegaCineCameraLayer />
          <div
            ref={mirrorRef}
            className="pointer-events-none relative z-10 h-full w-full select-none"
            style={SPLIT_PANEL_SCENE_STYLE}
            aria-hidden
          >
            <MegaCineScene />
          </div>
        </div>

        <div className="relative flex h-full w-1/2 shrink-0 items-center justify-center overflow-hidden border-l-2 border-cyan-500/50">
          <MegaCineCameraLayer />
          <div ref={masterRef} className="relative z-10 h-full w-full" style={SPLIT_PANEL_SCENE_STYLE}>
            <MegaCineScene />
          </div>
        </div>
      </div>
    </MegaCineSplitProvider>
  );
}

export default function TripleCinemaScreens() {
  const [splitVertical, setSplitVertical] = useState(false);

  return (
    <>
      {splitVertical ? (
        <SplitMegaCineView />
      ) : (
        <div className="absolute inset-0">
          <MegaCineCameraLayer />
          <MegaCineScene />
        </div>
      )}

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
