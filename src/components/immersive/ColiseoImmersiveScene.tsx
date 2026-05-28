import { Html, PointerLockControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import ColiseoBrowserPanel from "@/components/immersive/ColiseoBrowserPanel";
import {
  EquirectangularInterior,
  ImmersiveOrbitControls,
  SPHERE_RADIUS,
} from "@/components/immersive/equirectSphereCore";
import { COLOSSEO_PANORAMA } from "@/data/coliseoScene";
import {
  MAX_WEBGL_PIXEL_RATIO,
  applyPixelRatioCap,
  isMobileCoarseDevice,
  lobbyUsesPointerLockControls,
} from "@/lib/webglRendererPrefs";

const SCREEN_SIZE_SCALE = 0.86;
const SCREEN_POSITION: [number, number, number] = [0, 1.4, -7.2];
const SCREEN_PLANE_WIDTH = 6.2 * SCREEN_SIZE_SCALE;
const SCREEN_PLANE_HEIGHT = 3.48 * SCREEN_SIZE_SCALE;
const SCREEN_HTML_DISTANCE = 10.5 * SCREEN_SIZE_SCALE;
const SCREEN_HTML_MAX_WIDTH_PX = Math.round(720 * SCREEN_SIZE_SCALE);

const COLOSSEO_SCREEN_SELECTOR = "[data-coliseo-screen]";

function ColiseoOutsideScreenUnfocus({
  screenFocused,
  onUnfocus,
}: {
  screenFocused: boolean;
  onUnfocus: () => void;
}) {
  useEffect(() => {
    if (!screenFocused) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(COLOSSEO_SCREEN_SELECTOR)) return;
      onUnfocus();
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [screenFocused, onUnfocus]);

  return null;
}

function ColiseoFloatingScreen({
  screenFocused,
  onFocusScreen,
}: {
  screenFocused: boolean;
  onFocusScreen: () => void;
}) {
  return (
    <group position={SCREEN_POSITION}>
      {!screenFocused && (
        <mesh
          onPointerDown={(event) => {
            event.stopPropagation();
            onFocusScreen();
          }}
          onPointerOver={() => {
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            document.body.style.cursor = "auto";
          }}
        >
          <planeGeometry args={[SCREEN_PLANE_WIDTH, SCREEN_PLANE_HEIGHT]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}

      <Html
        transform
        distanceFactor={SCREEN_HTML_DISTANCE}
        center
        zIndexRange={[screenFocused ? 100 : 10, screenFocused ? 101 : 11]}
        style={{
          width: `min(${88 * SCREEN_SIZE_SCALE}vw, ${SCREEN_HTML_MAX_WIDTH_PX}px)`,
          pointerEvents: screenFocused ? "auto" : "none",
        }}
      >
        <ColiseoBrowserPanel screenFocused={screenFocused} onFocusScreen={onFocusScreen} />
      </Html>
    </group>
  );
}

function ColiseoSceneContent({
  screenFocused,
  onFocusScreen,
  onUnfocusScreen,
}: {
  screenFocused: boolean;
  onFocusScreen: () => void;
  onUnfocusScreen: () => void;
}) {
  return (
    <>
      <Suspense fallback={null}>
        <EquirectangularInterior url={COLOSSEO_PANORAMA} />
      </Suspense>
      <ambientLight intensity={0.82} />
      <ColiseoFloatingScreen screenFocused={screenFocused} onFocusScreen={onFocusScreen} />
      <ColiseoOutsideScreenUnfocus screenFocused={screenFocused} onUnfocus={onUnfocusScreen} />
    </>
  );
}

export default function ColiseoImmersiveScene() {
  const [screenFocused, setScreenFocused] = useState(false);
  const [pointerLocked, setPointerLocked] = useState(false);
  const screenFocusedRef = useRef(false);
  const usesPointerLock = useMemo(() => lobbyUsesPointerLockControls(), []);
  const mobileCoarse = useMemo(() => isMobileCoarseDevice(), []);

  useEffect(() => {
    screenFocusedRef.current = screenFocused;
  }, [screenFocused]);

  const focusScreen = useCallback(() => {
    if (document.pointerLockElement) document.exitPointerLock();
    setScreenFocused(true);
    setPointerLocked(false);
  }, []);

  const unfocusScreen = useCallback(() => {
    setScreenFocused(false);
    if (document.pointerLockElement) document.exitPointerLock();
  }, []);

  const handleEscape = useCallback(() => {
    if (screenFocusedRef.current) {
      unfocusScreen();
      return;
    }
    if (document.pointerLockElement) document.exitPointerLock();
  }, [unfocusScreen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      handleEscape();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleEscape]);

  const onPointerMissed = useCallback(() => {
    if (screenFocusedRef.current) unfocusScreen();
  }, [unfocusScreen]);

  return (
    <div
      className="relative h-[100dvh] w-full bg-black [&_*]:outline-none"
      style={{ touchAction: screenFocused ? "auto" : "none" }}
    >
      <Canvas
        className={screenFocused ? "pointer-events-none" : "touch-none"}
        gl={{ antialias: !mobileCoarse, alpha: false, powerPreference: "high-performance" }}
        camera={{ position: [0, 0, 0.12], fov: 78, far: SPHERE_RADIUS * 2 }}
        onPointerMissed={onPointerMissed}
        dpr={[1, MAX_WEBGL_PIXEL_RATIO]}
        onCreated={({ gl }) => applyPixelRatioCap(gl)}
      >
        <Suspense fallback={null}>
          <ColiseoSceneContent
            screenFocused={screenFocused}
            onFocusScreen={focusScreen}
            onUnfocusScreen={unfocusScreen}
          />
        </Suspense>
        {usesPointerLock ? (
          !screenFocused && (
            <PointerLockControls
              onLock={() => setPointerLocked(true)}
              onUnlock={() => setPointerLocked(false)}
            />
          )
        ) : (
          <ImmersiveOrbitControls enabled={!screenFocused} />
        )}
      </Canvas>

      {usesPointerLock && pointerLocked && !screenFocused && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80 mix-blend-difference" />
      )}

      {!screenFocused && (
        <p className="pointer-events-none absolute bottom-4 left-1/2 z-10 max-w-md -translate-x-1/2 px-4 text-center text-[11px] text-slate-400">
          {usesPointerLock
            ? "Clic fuera de la pantalla: girar sin límite · Clic en la pantalla: usar el navegador"
            : "Arrastra fuera de la pantalla para girar · Toca la pantalla para navegar"}
        </p>
      )}
    </div>
  );
}
