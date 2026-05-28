import { PointerLockControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import ColiseoAndroidWebViewSlot from "@/components/immersive/ColiseoBrowserPanel";
import {
  EquirectangularInterior,
  ImmersiveOrbitControls,
  SPHERE_RADIUS,
} from "@/components/immersive/equirectSphereCore";
import { COLOSSEO_PANORAMA } from "@/data/coliseoScene";
import { isColiseoNativeWebViewAvailable } from "@/lib/coliseoNativeWebView";
import {
  MAX_WEBGL_PIXEL_RATIO,
  applyPixelRatioCap,
  isMobileCoarseDevice,
  lobbyUsesPointerLockControls,
} from "@/lib/webglRendererPrefs";

function ColiseoSceneContent() {
  return (
    <>
      <Suspense fallback={null}>
        <EquirectangularInterior url={COLOSSEO_PANORAMA} />
      </Suspense>
      <ambientLight intensity={0.82} />
    </>
  );
}

export default function ColiseoImmersiveScene() {
  const useNativeWebView = useMemo(() => isColiseoNativeWebViewAvailable(), []);
  const [pointerLocked, setPointerLocked] = useState(false);
  const usesPointerLock = useMemo(() => lobbyUsesPointerLockControls(), []);
  const mobileCoarse = useMemo(() => isMobileCoarseDevice(), []);

  const handleEscape = useCallback(() => {
    if (document.pointerLockElement) document.exitPointerLock();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      handleEscape();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleEscape]);

  return (
    <div className="relative h-[100dvh] w-full bg-black [&_*]:outline-none">
      <Canvas
        className={useNativeWebView ? "absolute inset-0 h-full w-full" : "touch-none"}
        gl={{ antialias: !mobileCoarse, alpha: false, powerPreference: "high-performance" }}
        camera={{ position: [0, 0, 0.12], fov: 78, far: SPHERE_RADIUS * 2 }}
        dpr={[1, MAX_WEBGL_PIXEL_RATIO]}
        onCreated={({ gl }) => applyPixelRatioCap(gl)}
      >
        <Suspense fallback={null}>
          <ColiseoSceneContent />
        </Suspense>
        {usesPointerLock && !useNativeWebView ? (
          <PointerLockControls
            onLock={() => setPointerLocked(true)}
            onUnlock={() => setPointerLocked(false)}
          />
        ) : (
          <ImmersiveOrbitControls enabled />
        )}
      </Canvas>

      {useNativeWebView && (
        <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center px-2">
          <div className="pointer-events-auto h-[min(42vh,340px)] w-[min(92vw,720px)]">
            <ColiseoAndroidWebViewSlot />
          </div>
        </div>
      )}

      {usesPointerLock && !useNativeWebView && pointerLocked && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80 mix-blend-difference" />
      )}

      <p className="pointer-events-none absolute bottom-4 left-1/2 z-10 max-w-md -translate-x-1/2 px-4 text-center text-[11px] text-slate-400">
        {useNativeWebView
          ? "Arrastra fuera del video para girar el Coliseo 360°"
          : usesPointerLock
            ? "Clic para girar la vista 360°"
            : "Arrastra para girar la vista 360°"}
      </p>
    </div>
  );
}
