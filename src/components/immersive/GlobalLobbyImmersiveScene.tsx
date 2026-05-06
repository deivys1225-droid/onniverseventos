import { Html } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  EquirectangularInterior,
  ImmersiveOrbitControls,
  SPHERE_RADIUS,
} from "@/components/immersive/equirectSphereCore";
import {
  MAX_WEBGL_PIXEL_RATIO,
  applyPixelRatioCap,
  isMobileCoarseDevice,
} from "@/lib/webglRendererPrefs";

const LOBBY_PANORAMA =
  "https://images.unsplash.com/photo-1478760329108-5c3e1527712f?auto=format&fit=crop&w=4096&q=85";

function LobbySceneContent({
  embedUrl,
  feedPlaying,
  currentIndex,
  totalVideos,
  onToggleFeed,
  onPrev,
  onNext,
}: {
  embedUrl: string;
  feedPlaying: boolean;
  currentIndex: number;
  totalVideos: number;
  onToggleFeed: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <>
      <Suspense fallback={null}>
        <EquirectangularInterior url={LOBBY_PANORAMA} />
      </Suspense>
      <ambientLight intensity={0.75} />

      <Html position={[0, 1.5, -6.5]} transform distanceFactor={10} center style={{ width: "min(92vw, 900px)" }}>
        <div
          className="rounded-2xl border border-cyan-400/30 bg-black/55 p-3 shadow-[0_50px_120px_rgba(0,0,0,0.9)] backdrop-blur-md"
          style={{ pointerEvents: "auto" }}
        >
          <div className="relative w-full overflow-hidden rounded-xl border border-white/15 bg-black">
            <div className="aspect-video w-full">
              <iframe
                key={embedUrl}
                title="Lobby Global — feed 360"
                src={embedUrl}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
                className="relative z-0 h-full w-full border-0"
              />
            </div>
            <button
              type="button"
              onClick={onToggleFeed}
              className="absolute inset-0 z-10 cursor-pointer bg-transparent"
              aria-label={feedPlaying ? "Pausar avance automático del feed" : "Reanudar avance automático del feed"}
            />
            <p className="pointer-events-none absolute bottom-2 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-[10px] font-display uppercase tracking-wider text-white/90">
              Clic en pantalla: {feedPlaying ? "pausa feed" : "reanuda feed"}
            </p>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
            <Button type="button" variant="heroOutline" size="sm" className="gap-1" onClick={onPrev}>
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Button>
            <Button
              type="button"
              variant="hero"
              size="sm"
              className="gap-1"
              onClick={onToggleFeed}
              title={feedPlaying ? "Pausar avance automático" : "Reanudar avance automático"}
            >
              {feedPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {feedPlaying ? "Feed on" : "Feed off"}
            </Button>
            <Button type="button" variant="heroOutline" size="sm" className="gap-1" onClick={onNext}>
              Siguiente <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="text-[10px] font-display uppercase tracking-widest text-cyan-300/90">
              {currentIndex + 1} / {totalVideos}
            </span>
          </div>
        </div>
      </Html>

      <Html position={[-4, 2.4, -5.5]} transform distanceFactor={9}>
        <div
          className="max-w-xs rounded-2xl border border-cyan-500/35 bg-black/60 p-3 shadow-xl backdrop-blur-xl"
          style={{ pointerEvents: "auto" }}
        >
          <Link
            to="/"
            className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-400/45 px-3 py-1.5 text-[10px] font-display font-bold uppercase tracking-wider text-cyan-100"
          >
            ← Inicio
          </Link>
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary">Lobby Global</p>
          <p className="font-display text-sm font-bold text-white">Feed TikTok 360</p>
          <p className="text-[11px] text-slate-400">Videos públicos en bucle. Explora el entorno girando la vista.</p>
        </div>
      </Html>
    </>
  );
}

export interface GlobalLobbyImmersiveSceneProps {
  embedUrl: string;
  feedPlaying: boolean;
  currentIndex: number;
  totalVideos: number;
  onToggleFeed: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export default function GlobalLobbyImmersiveScene({
  embedUrl,
  feedPlaying,
  currentIndex,
  totalVideos,
  onToggleFeed,
  onPrev,
  onNext,
}: GlobalLobbyImmersiveSceneProps) {
  const onPointerMissed = useCallback(() => {}, []);
  const mobileCoarse = useMemo(() => isMobileCoarseDevice(), []);

  return (
    <div className="h-[100dvh] w-full touch-none bg-black [&_*]:outline-none" style={{ touchAction: "none" }}>
      <Canvas
        gl={{ antialias: !mobileCoarse, alpha: false, powerPreference: "high-performance" }}
        camera={{ position: [0, 0, 0.12], fov: 72, far: SPHERE_RADIUS * 2 }}
        onPointerMissed={onPointerMissed}
        dpr={[1, MAX_WEBGL_PIXEL_RATIO]}
        onCreated={({ gl }) => applyPixelRatioCap(gl)}
      >
        <Suspense fallback={null}>
          <LobbySceneContent
            embedUrl={embedUrl}
            feedPlaying={feedPlaying}
            currentIndex={currentIndex}
            totalVideos={totalVideos}
            onToggleFeed={onToggleFeed}
            onPrev={onPrev}
            onNext={onNext}
          />
        </Suspense>
        <ImmersiveOrbitControls />
      </Canvas>
    </div>
  );
}
