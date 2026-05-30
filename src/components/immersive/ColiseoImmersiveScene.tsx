import { PointerLockControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import ColiseoFloatingWebViewScreen from "@/components/immersive/ColiseoFloatingWebViewScreen";
import ColiseoFloatingPdfScreen from "@/components/immersive/ColiseoFloatingPdfScreen";
import LobbyDecorHeartWall from "@/components/lobby/LobbyDecorHeartWall";
import {
  EquirectangularInterior,
  ImmersiveOrbitControls,
  SPHERE_RADIUS,
} from "@/components/immersive/equirectSphereCore";
import {
  COLOSSEO_PANORAMA,
} from "@/data/coliseoScene";
import { isColiseoNativeWebViewAvailable } from "@/lib/coliseoNativeWebView";
import {
  MAX_WEBGL_PIXEL_RATIO,
  applyPixelRatioCap,
  isMobileCoarseDevice,
  lobbyUsesPointerLockControls,
} from "@/lib/webglRendererPrefs";

function ColiseoSceneContent({
  onScreenPointerDown,
  mixedRealityActive,
}: {
  onScreenPointerDown?: () => void;
  mixedRealityActive: boolean;
}) {
  return (
    <>
      <Suspense fallback={null}>
        {!mixedRealityActive && <EquirectangularInterior url={COLOSSEO_PANORAMA} />}
      </Suspense>
      <ambientLight intensity={0.68} />
      <ColiseoFloatingWebViewScreen onScreenPointerDown={onScreenPointerDown} />
      <ColiseoFloatingPdfScreen onScreenPointerDown={onScreenPointerDown} />
      <LobbyDecorHeartWall
        position={[10.5, 1.6, -0.4]}
        rotation={[0, Math.PI, 0]}
        scaleMultiplier={1.35}
      />
      <pointLight
        position={[10.1, 2.6, 0.1]}
        intensity={1.85}
        distance={8.8}
        color="#ffffff"
      />
    </>
  );
}

export default function ColiseoImmersiveScene({ mixedRealityActive = false }: { mixedRealityActive?: boolean }) {
  const useNativeWebView = useMemo(() => isColiseoNativeWebViewAvailable(), []);
  const [pointerLocked, setPointerLocked] = useState(false);
  const [screenInteracting, setScreenInteracting] = useState(false);
  const suppressPointerLockUntilRef = useRef(0);
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

  const handleScreenPointerDown = useCallback(() => {
    setScreenInteracting(true);
    if (document.pointerLockElement) document.exitPointerLock();
  }, []);

  const pointerLockEnabled = usesPointerLock && !useNativeWebView && !screenInteracting;

  useEffect(() => {
    const onWindowPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (document.pointerLockElement) {
        suppressPointerLockUntilRef.current = Date.now() + 900;
        document.exitPointerLock();
        return;
      }
      const clickedInsideInteractiveScreen = Boolean(target?.closest("[data-coliseo-screen='true']"));
      if (clickedInsideInteractiveScreen) {
        setScreenInteracting(true);
        if (document.pointerLockElement) document.exitPointerLock();
        return;
      }
      setScreenInteracting(false);
    };
    window.addEventListener("pointerdown", onWindowPointerDown, true);
    return () => window.removeEventListener("pointerdown", onWindowPointerDown, true);
  }, []);

  return (
    <div className={`relative h-[100dvh] w-full [&_*]:outline-none ${mixedRealityActive ? "bg-transparent" : "bg-black"}`}>
      <Canvas
        className="relative z-10 touch-none"
        gl={{ antialias: !mobileCoarse, alpha: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 0, 0.12], fov: 78, far: SPHERE_RADIUS * 2 }}
        dpr={[1, MAX_WEBGL_PIXEL_RATIO]}
        onCreated={({ gl }) => applyPixelRatioCap(gl)}
      >
        <Suspense fallback={null}>
          <ColiseoSceneContent
            onScreenPointerDown={handleScreenPointerDown}
            mixedRealityActive={mixedRealityActive}
          />
        </Suspense>
        {pointerLockEnabled ? (
          <PointerLockControls
            onLock={() => {
              if (Date.now() < suppressPointerLockUntilRef.current || screenInteracting) {
                document.exitPointerLock();
                setPointerLocked(false);
                return;
              }
              setPointerLocked(true);
            }}
            onUnlock={() => setPointerLocked(false)}
          />
        ) : (
          <ImmersiveOrbitControls enabled={!screenInteracting} />
        )}
      </Canvas>

      {usesPointerLock && !useNativeWebView && pointerLocked && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80 mix-blend-difference" />
      )}

      <p className="pointer-events-none absolute bottom-4 left-1/2 z-10 max-w-md -translate-x-1/2 px-4 text-center text-[11px] text-slate-400">
        {useNativeWebView
          ? "Arrastra fuera de la pantalla para girar el Coliseo 360°"
          : pointerLockEnabled
            ? "Clic para girar vista 360° · Clic en pantalla = interactuar video"
            : "Arrastra para girar · Clic en pantalla = interactuar video"}
      </p>
    </div>
  );
}
