import {
  Suspense,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { Canvas, useFrame, useLoader, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { useNavigate } from "react-router-dom";
import { Landmark } from "lucide-react";
import { COLOSSEO_PATH } from "@/data/coliseoScene";
import { invokeOpenColiceoDirect } from "@/lib/coliseoOpenDirect";
import { invokeOpenGalleryDirect } from "@/lib/galleryOpenDirect";
import { LOBBY_IMMERSIVE_PATH, LOBBY_OPEN_TRANSITION_MS } from "@/lib/lobbyImmersive";
import { invokeOpenLobbyDirect } from "@/lib/lobbyOpenDirect";
import {
  getRoomMode,
  type MiMundoEnvironmentId,
} from "@/data/miMundoEnvironments";
import {
  MAX_WEBGL_PIXEL_RATIO,
  VR_STEREO_PIXEL_RATIO,
  applyPixelRatioCap,
  getAdaptiveSphereSegments,
  isMobileCoarseDevice,
} from "@/lib/webglRendererPrefs";
import { useIsMobile } from "@/hooks/use-mobile";
import { useVrModeActive } from "@/hooks/useVrModeActive";
import ProfileCard, { type ProfileCardConfirmPayload } from "@/components/ProfileCard";
import {
  LOCKED_CAMERA_FOV,
  LOCKED_CAMERA_ORBIT_TARGET_Y,
  LOCKED_CAMERA_POSITION,
  LOCKED_CENTRAL_SPHERE_RADIUS,
  LOCKED_EARTH_MOBILE_SCALE,
  LOCKED_EARTH_SCENE_Y,
  LOCKED_MOON,
  LOCKED_PROFILE_CARD_WRAPPER_CLASS,
} from "@/config/lockedHomeLayout";

/**
 * Texturas Tierra alta resolucion (offline-first, copiadas a /public/assets/textures/earth/).
 * Rutas root-relativas para que Capacitor WebView (`androidScheme: "https"`) las resuelva
 * desde `https://localhost/assets/...` sin depender de CDN externo.
 */
const EARTH_TEXTURES_BASE = "/assets/textures/earth";
const EARTH_DAY_4K = `${EARTH_TEXTURES_BASE}/earth_day_4096.jpg`;
const EARTH_NORMAL = `${EARTH_TEXTURES_BASE}/earth_normal_2048.jpg`;
const EARTH_SPECULAR = `${EARTH_TEXTURES_BASE}/earth_specular_2048.jpg`;
const EARTH_CLOUDS = `${EARTH_TEXTURES_BASE}/earth_clouds_1024.png`;

/** Tierra y luna al 50% del tamano anterior. Valor bloqueado en lockedHomeLayout. */
const CENTRAL_SPHERE_RADIUS = LOCKED_CENTRAL_SPHERE_RADIUS;

/** Luna: textura local ligera + parametros de orbita. */
const MOON_TEXTURE_URL = "/assets/textures/moon/moon_1024.jpg";
const MOON_RADIUS = CENTRAL_SPHERE_RADIUS * 0.27;
const MOON_ORBIT_RADIUS = CENTRAL_SPHERE_RADIUS * LOCKED_MOON.orbitRadiusFactor;
const MOON_ORBIT_SPEED = 0.22;
const EARTH_ROTATION_SPEED = 0.08;
const EARTH_TAP_MAX_MOVE_PX = 14;
const EARTH_TAP_MAX_MOVE_PX_MOBILE = 22;
const EARTH_TAP_MAX_MS = 650;
const EARTH_TAP_MAX_MS_MOBILE = 900;
const PROFILE_NAME_STORAGE_KEY = "onniverso.profile.name";
function readStoredProfileName(): string | undefined {
  try {
    const raw = localStorage.getItem(PROFILE_NAME_STORAGE_KEY)?.trim();
    return raw || undefined;
  } catch {
    return undefined;
  }
}
const EARTH_DRAG_YAW = 0.0052;
const EARTH_DRAG_PITCH = 0.0032;
const EARTH_DRAG_PITCH_MAX = 0.42;
const EARTH_ZOOM_MIN = 3.2;
const EARTH_ZOOM_MAX = 12;
const EARTH_WHEEL_ZOOM = 0.008;
/** Radio de captura táctil/ratón (Tierra + órbita lunar); no altera posición bloqueada. */
const EARTH_DRAG_HIT_RADIUS = MOON_ORBIT_RADIUS + MOON_RADIUS + CENTRAL_SPHERE_RADIUS * 0.35;

type EarthSceneInteractionContextValue = {
  userDraggedRef: RefObject<boolean>;
};

const EarthSceneInteractionContext = createContext<EarthSceneInteractionContextValue | null>(null);

/**
 * Giro manual in-place del pivote (Tierra + Luna). No modifica `position` ni rotación natural de hijos.
 */
function useEarthMoonDrag(pivotRef: RefObject<THREE.Group | null>, enabled: boolean) {
  const { gl } = useThree();
  const isMobileCoarse = useMemo(() => isMobileCoarseDevice(), []);
  const dragMoveThreshold = isMobileCoarse ? 6 : 2;
  const draggingRef = useRef(false);
  const lastRef = useRef({ x: 0, y: 0 });
  const manualRef = useRef({ yaw: 0, pitch: 0 });
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ span: number; distance: number } | null>(null);
  const userDraggedRef = useRef(false);

  const applyPivotRotation = useCallback(() => {
    if (!pivotRef.current) return;
    pivotRef.current.rotation.order = "YXZ";
    pivotRef.current.rotation.y = manualRef.current.yaw;
    pivotRef.current.rotation.x = manualRef.current.pitch;
    pivotRef.current.rotation.z = 0;
  }, [pivotRef]);

  useFrame(() => {
    if (!enabled) return;
    applyPivotRotation();
  });

  const pointerSpan = useCallback(() => {
    const pts = [...pointersRef.current.values()];
    if (pts.length < 2) return 0;
    return Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
  }, []);

  const onPointerDown = useCallback(
    (e: PointerEvent) => {
      if (!enabled) return;
      const el = gl.domElement;
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointersRef.current.size === 2) {
        draggingRef.current = false;
        pinchRef.current = { span: pointerSpan(), distance: 0 };
        return;
      }
      if (e.button !== 0) return;
      draggingRef.current = true;
      userDraggedRef.current = false;
      lastRef.current = { x: e.clientX, y: e.clientY };
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    [enabled, gl.domElement, pointerSpan],
  );

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!enabled) return;
      if (!pointersRef.current.has(e.pointerId)) return;
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointersRef.current.size >= 2 && pinchRef.current) {
        return;
      }

      if (!draggingRef.current) return;
      const dx = e.clientX - lastRef.current.x;
      const dy = e.clientY - lastRef.current.y;
      if (Math.abs(dx) > dragMoveThreshold || Math.abs(dy) > dragMoveThreshold) {
        userDraggedRef.current = true;
      }
      lastRef.current = { x: e.clientX, y: e.clientY };
      manualRef.current.yaw += dx * EARTH_DRAG_YAW;
      manualRef.current.pitch += dy * EARTH_DRAG_PITCH;
      manualRef.current.pitch = THREE.MathUtils.clamp(
        manualRef.current.pitch,
        -EARTH_DRAG_PITCH_MAX,
        EARTH_DRAG_PITCH_MAX,
      );
      applyPivotRotation();
    },
    [applyPivotRotation, dragMoveThreshold, enabled],
  );

  const onPointerEnd = useCallback((e: PointerEvent) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (pointersRef.current.size === 0) draggingRef.current = false;
    try {
      gl.domElement.releasePointerCapture(e.pointerId);
    } catch {
      /* ya liberado */
    }
  }, [gl.domElement]);

  const r3fPointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      onPointerDown(e.nativeEvent);
    },
    [onPointerDown],
  );

  const r3fPointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!draggingRef.current) return;
      e.stopPropagation();
      onPointerMove(e.nativeEvent);
    },
    [onPointerMove],
  );

  const r3fPointerUp = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      onPointerEnd(e.nativeEvent);
    },
    [onPointerEnd],
  );

  return {
    userDraggedRef,
    onPointerDown,
    onPointerMove,
    onPointerEnd,
    r3fPointerDown,
    r3fPointerMove,
    r3fPointerUp,
  };
}

/** Esfera invisible para arrastre; no intercepta taps (el raycast iría a la Tierra). */
function EarthMoonDragHitShell() {
  const seg = 20;
  return (
    <mesh renderOrder={-1} raycast={() => null}>
      <sphereGeometry args={[EARTH_DRAG_HIT_RADIUS, seg, seg]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} depthTest={false} />
    </mesh>
  );
}

/**
 * Cámara fija al blanco (sin balanceo) + arrastre para girar + zoom rueda/pellizco.
 */
function EarthViewController({
  basePosition,
  target,
  pivotRef,
  enabled,
  drag,
}: {
  basePosition: [number, number, number];
  target: [number, number, number];
  pivotRef: RefObject<THREE.Group | null>;
  enabled: boolean;
  drag: ReturnType<typeof useEarthMoonDrag>;
}) {
  const { camera, gl } = useThree();
  const tgt = useMemo(() => new THREE.Vector3(...target), [target]);
  const viewDir = useMemo(() => {
    const p = new THREE.Vector3(...basePosition);
    return p.sub(tgt).normalize();
  }, [basePosition, tgt]);
  const distanceRef = useRef(new THREE.Vector3(...basePosition).distanceTo(tgt));
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ span: number; distance: number } | null>(null);

  useFrame(() => {
    if (!enabled) return;
    camera.position.copy(tgt).addScaledVector(viewDir, distanceRef.current);
    camera.lookAt(tgt);
  });

  useEffect(() => {
    if (!enabled) return;
    const el = gl.domElement;

    const pointerSpan = () => {
      const pts = [...pointersRef.current.values()];
      if (pts.length < 2) return 0;
      return Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      distanceRef.current = THREE.MathUtils.clamp(
        distanceRef.current + e.deltaY * EARTH_WHEEL_ZOOM,
        EARTH_ZOOM_MIN,
        EARTH_ZOOM_MAX,
      );
    };

    const onPointerDown = (e: PointerEvent) => {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointersRef.current.size === 2) {
        pinchRef.current = { span: pointerSpan(), distance: distanceRef.current };
        return;
      }
      drag.onPointerDown(e);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!pointersRef.current.has(e.pointerId)) return;
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointersRef.current.size >= 2 && pinchRef.current) {
        const span = pointerSpan();
        if (span > 0 && pinchRef.current.span > 0) {
          const ratio = pinchRef.current.span / span;
          distanceRef.current = THREE.MathUtils.clamp(
            pinchRef.current.distance * ratio,
            EARTH_ZOOM_MIN,
            EARTH_ZOOM_MAX,
          );
        }
        return;
      }

      drag.onPointerMove(e);
    };

    const onPointerEnd = (e: PointerEvent) => {
      pointersRef.current.delete(e.pointerId);
      if (pointersRef.current.size < 2) pinchRef.current = null;
      drag.onPointerEnd(e);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerEnd);
    el.addEventListener("pointercancel", onPointerEnd);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerEnd);
      el.removeEventListener("pointercancel", onPointerEnd);
    };
  }, [drag, enabled, gl]);

  return null;
}

/** Pivote Tierra+Luna con arrastre R3F y contexto para distinguir tap vs drag. */
function EarthMoonPivot({
  earthSceneY,
  scale,
  children,
  enabled,
}: {
  earthSceneY: number;
  scale: number;
  children: ReactNode;
  enabled: boolean;
}) {
  const pivotRef = useRef<THREE.Group>(null);
  const drag = useEarthMoonDrag(pivotRef, enabled);
  const interactionValue = useMemo(() => ({ userDraggedRef: drag.userDraggedRef }), [drag.userDraggedRef]);

  return (
    <EarthSceneInteractionContext.Provider value={interactionValue}>
      <group ref={pivotRef} position={[0, earthSceneY, 0]} scale={[scale, scale, scale]}>
        {children}
        <EarthMoonDragHitShell />
      </group>
      <EarthViewControllerBridge pivotRef={pivotRef} drag={drag} enabled={enabled} />
    </EarthSceneInteractionContext.Provider>
  );
}

function EarthViewControllerBridge({
  pivotRef,
  drag,
  enabled,
}: {
  pivotRef: RefObject<THREE.Group | null>;
  drag: ReturnType<typeof useEarthMoonDrag>;
  enabled: boolean;
}) {
  const isMobileCoarse = useMemo(() => isMobileCoarseDevice(), []);
  const isNarrowViewport = useIsMobile();
  const cameraPosition = isMobileCoarse
    ? ([...LOCKED_CAMERA_POSITION.mobile] as [number, number, number])
    : ([...LOCKED_CAMERA_POSITION.desktop] as [number, number, number]);
  const orbitTarget = useMemo<[number, number, number]>(
    () => [
      0,
      isNarrowViewport ? LOCKED_CAMERA_ORBIT_TARGET_Y.mobile : LOCKED_CAMERA_ORBIT_TARGET_Y.desktop,
      0,
    ],
    [isNarrowViewport],
  );

  return (
    <EarthViewController
      basePosition={cameraPosition}
      target={orbitTarget}
      pivotRef={pivotRef}
      enabled={enabled}
      drag={drag}
    />
  );
}

function OrbitingMoon({ simpleGpu, vrStereo }: { simpleGpu: boolean; vrStereo: boolean }) {
  const pivotRef = useRef<THREE.Group>(null);
  const moonTexture = useLoader(THREE.TextureLoader, MOON_TEXTURE_URL);

  const moonSeg = useMemo(() => getAdaptiveSphereSegments(vrStereo), [vrStereo]);

  useEffect(() => {
    moonTexture.colorSpace = THREE.SRGBColorSpace;
    moonTexture.anisotropy = vrStereo ? 1 : simpleGpu ? 2 : 8;
  }, [moonTexture, simpleGpu, vrStereo]);

  useFrame((_, delta) => {
    if (pivotRef.current) {
      pivotRef.current.rotation.y += delta * MOON_ORBIT_SPEED;
    }
  });

  return (
    <group ref={pivotRef} rotation={[LOCKED_MOON.orbitTiltX, 0, 0]}>
      <mesh position={[MOON_ORBIT_RADIUS, LOCKED_MOON.meshY, 0]} key={`moon-${moonSeg}`}>
        <sphereGeometry args={[MOON_RADIUS, moonSeg, moonSeg]} />
        <meshBasicMaterial map={moonTexture} toneMapped transparent opacity={1} />
      </mesh>
    </group>
  );
}

/**
 * Invierte canal de brillo Phong (oceano claro = mas brillante) a roughness PBR (oscuro = menos rugoso).
 */
function specularToRoughnessTexture(specular: THREE.Texture): THREE.CanvasTexture {
  const img = specular.image as HTMLImageElement;
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < data.data.length; i += 4) {
    const g = data.data[i] / 255;
    const rough = 0.22 + (1 - g) * 0.78;
    const v = Math.round(rough * 255);
    data.data[i] = data.data[i + 1] = data.data[i + 2] = v;
  }
  ctx.putImageData(data, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

function useEarthTapPointerDown(
  vrStereo: boolean,
  onOpenLobby: (() => void) | undefined,
) {
  const activePointerEndRef = useRef<((ev: PointerEvent) => void) | null>(null);

  useEffect(() => {
    return () => {
      const h = activePointerEndRef.current;
      if (h) {
        window.removeEventListener("pointerup", h);
        window.removeEventListener("pointercancel", h);
        activePointerEndRef.current = null;
      }
    };
  }, []);

  const interaction = useContext(EarthSceneInteractionContext);
  const isMobileCoarse = useMemo(() => isMobileCoarseDevice(), []);

  return useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (vrStereo || !onOpenLobby) return;

      event.stopPropagation();
      const native = event.nativeEvent;
      if (typeof native.preventDefault === "function") {
        native.preventDefault();
      }

      const prev = activePointerEndRef.current;
      if (prev) {
        window.removeEventListener("pointerup", prev);
        window.removeEventListener("pointercancel", prev);
        activePointerEndRef.current = null;
      }

      const pointerId = native.pointerId;
      const x0 = native.clientX;
      const y0 = native.clientY;
      const t0 = performance.now();

      const onPointerEnd = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        window.removeEventListener("pointerup", onPointerEnd);
        window.removeEventListener("pointercancel", onPointerEnd);
        activePointerEndRef.current = null;

        const dist = Math.hypot(ev.clientX - x0, ev.clientY - y0);
        const dt = performance.now() - t0;
        const maxMove = isMobileCoarse ? EARTH_TAP_MAX_MOVE_PX_MOBILE : EARTH_TAP_MAX_MOVE_PX;
        const maxMs = isMobileCoarse ? EARTH_TAP_MAX_MS_MOBILE : EARTH_TAP_MAX_MS;
        if (dist > maxMove || dt > maxMs) return;
        if (interaction?.userDraggedRef.current) return;

        if (typeof ev.preventDefault === "function") {
          ev.preventDefault();
        }
        onOpenLobby();
      };

      activePointerEndRef.current = onPointerEnd;
      window.addEventListener("pointerup", onPointerEnd);
      window.addEventListener("pointercancel", onPointerEnd);
    },
    [interaction, isMobileCoarse, vrStereo, onOpenLobby],
  );
}

/** Planeta Tierra central: tap abre lobby inmersivo. */
function CentralEarth({
  simpleGpu,
  vrStereo,
  onOpenLobby,
}: {
  simpleGpu: boolean;
  vrStereo: boolean;
  onOpenLobby?: () => void;
}) {
  const earthRef = useRef<THREE.Group>(null);
  const onEarthSurfacePointerDown = useEarthTapPointerDown(vrStereo, onOpenLobby);
  const [dayMap, normalMap, specularMap, cloudsMap] = useLoader(THREE.TextureLoader, [
    EARTH_DAY_4K,
    EARTH_NORMAL,
    EARTH_SPECULAR,
    EARTH_CLOUDS,
  ]);

  const roughnessMap = useMemo(
    () => (simpleGpu ? null : specularToRoughnessTexture(specularMap)),
    [specularMap, simpleGpu],
  );

  useEffect(() => {
    return () => roughnessMap?.dispose();
  }, [roughnessMap]);

  useEffect(() => {
    const antisoBase = vrStereo ? 2 : simpleGpu ? 4 : 16;
    const antisoCloud = vrStereo ? 1 : simpleGpu ? 2 : 12;
    dayMap.colorSpace = THREE.SRGBColorSpace;
    dayMap.anisotropy = antisoBase;
    dayMap.minFilter = THREE.LinearMipmapLinearFilter;
    dayMap.magFilter = THREE.LinearFilter;
    normalMap.colorSpace = THREE.NoColorSpace;
    normalMap.anisotropy = antisoBase;
    specularMap.colorSpace = THREE.NoColorSpace;
    cloudsMap.colorSpace = THREE.SRGBColorSpace;
    cloudsMap.anisotropy = antisoCloud;
  }, [dayMap, normalMap, specularMap, cloudsMap, simpleGpu, vrStereo]);

  useFrame((_, delta) => {
    if (!earthRef.current) return;
    // Solo giro natural en eje Y; sin deriva en X/Z que perciba balanceo.
    earthRef.current.rotation.x = 0;
    earthRef.current.rotation.z = 0;
    earthRef.current.rotation.y += delta * EARTH_ROTATION_SPEED;
  });

  const seg = useMemo(() => getAdaptiveSphereSegments(vrStereo), [vrStereo]);

  if (simpleGpu) {
    return (
      <group ref={earthRef} key={`earth-s-${seg}`}>
        <mesh renderOrder={0} onPointerDown={onEarthSurfacePointerDown}>
          <sphereGeometry args={[CENTRAL_SPHERE_RADIUS, seg, seg]} />
          <meshBasicMaterial map={dayMap} toneMapped />
        </mesh>
        <mesh renderOrder={1} scale={1.0018} onPointerDown={onEarthSurfacePointerDown}>
          <sphereGeometry args={[CENTRAL_SPHERE_RADIUS, seg, seg]} />
          <meshBasicMaterial map={cloudsMap} transparent opacity={0.92} depthWrite={false} toneMapped />
        </mesh>
        <mesh renderOrder={2} scale={1.024}>
          <sphereGeometry args={[CENTRAL_SPHERE_RADIUS, seg, seg]} />
          <meshBasicMaterial
            color="#6ab4ff"
            transparent
            opacity={0.085}
            depthWrite={false}
            side={THREE.FrontSide}
            blending={THREE.NormalBlending}
          />
        </mesh>
      </group>
    );
  }

  return (
    <group ref={earthRef} key={`earth-hd-${seg}`}>
      <mesh renderOrder={0} onPointerDown={onEarthSurfacePointerDown}>
        <sphereGeometry args={[CENTRAL_SPHERE_RADIUS, seg, seg]} />
        <meshStandardMaterial
          map={dayMap}
          normalMap={normalMap}
          normalScale={new THREE.Vector2(0.045, 0.045)}
          roughnessMap={roughnessMap ?? undefined}
          roughness={1}
          metalness={0.06}
          envMapIntensity={0}
          toneMapped
        />
      </mesh>
      <mesh renderOrder={1} scale={1.0018} onPointerDown={onEarthSurfacePointerDown}>
        <sphereGeometry args={[CENTRAL_SPHERE_RADIUS, seg, seg]} />
        <meshStandardMaterial
          map={cloudsMap}
          transparent
          opacity={0.92}
          depthWrite={false}
          roughness={1}
          metalness={0}
          envMapIntensity={0}
          toneMapped
        />
      </mesh>
      <mesh renderOrder={2} scale={1.024}>
        <sphereGeometry args={[CENTRAL_SPHERE_RADIUS, seg, seg]} />
        <meshBasicMaterial
          color="#6ab4ff"
          transparent
          opacity={0.085}
          depthWrite={false}
          side={THREE.FrontSide}
          blending={THREE.NormalBlending}
        />
      </mesh>
    </group>
  );
}

/** Stereo VR / capture mode: DPR 1, sin tone mapping tipo ACES (menos trabajo por frame). */
/** Evita Tierra ovalada/churro cuando el canvas cambia de proporción (móvil vertical). */
function PerspectiveCameraAspectSync() {
  const { camera, size, invalidate } = useThree();

  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const aspect = size.width / Math.max(size.height, 1);
    if (Math.abs(camera.aspect - aspect) > 0.0005) {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      invalidate();
    }
  }, [camera, size.width, size.height, invalidate]);

  return null;
}

function VrStereoPerfSync({ active }: { active: boolean }) {
  const { gl, invalidate } = useThree();
  const savedTone = useRef<{ tm: THREE.ToneMapping; exp: number } | null>(null);

  useEffect(() => {
    if (active) {
      savedTone.current = { tm: gl.toneMapping, exp: gl.toneMappingExposure };
      gl.setPixelRatio(VR_STEREO_PIXEL_RATIO);
      gl.toneMapping = THREE.NoToneMapping;
      gl.toneMappingExposure = 1;
      gl.shadowMap.enabled = false;
    } else {
      if (savedTone.current) {
        gl.toneMapping = savedTone.current.tm;
        gl.toneMappingExposure = savedTone.current.exp;
      } else {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 0.96;
      }
      applyPixelRatioCap(gl);
      gl.shadowMap.enabled = false;
    }
    invalidate();
  }, [active, gl, invalidate]);

  return null;
}

export type MiMundoVRSectionProps = {
  profileDisplayName?: string | null;
  profileAvatarUrl?: string | null;
  onProfilePersist?: (payload: ProfileCardConfirmPayload) => void | Promise<void>;
};

const MiMundoVRSection = ({
  profileDisplayName,
  profileAvatarUrl,
  onProfilePersist,
}: MiMundoVRSectionProps) => {
  const navigate = useNavigate();
  const [profileSaving, setProfileSaving] = useState(false);
  const [lobbyOpening, setLobbyOpening] = useState(false);
  const vrStereoActive = useVrModeActive();
  const environmentId = useMemo<MiMundoEnvironmentId>(() => "lobby", []);
  const storedProfileName = useMemo(
    () => (typeof window === "undefined" ? undefined : readStoredProfileName()),
    [],
  );

  const cardDisplayName =
    profileDisplayName?.trim() || storedProfileName || "Explorador VR";
  const cardAvatarSrc = profileAvatarUrl?.trim() || "/placeholder.svg";

  const roomMode = useMemo(() => getRoomMode(environmentId), [environmentId]);

  const isMobileCoarse = useMemo(() => isMobileCoarseDevice(), []);
  const isNarrowViewport = useIsMobile();
  const earthSceneY = isNarrowViewport ? LOCKED_EARTH_SCENE_Y.mobile : LOCKED_EARTH_SCENE_Y.desktop;
  const earthMoonScale = isNarrowViewport ? LOCKED_EARTH_MOBILE_SCALE : 1;
  const cameraPosition = isMobileCoarse
    ? ([...LOCKED_CAMERA_POSITION.mobile] as [number, number, number])
    : ([...LOCKED_CAMERA_POSITION.desktop] as [number, number, number]);
  const cameraFov = isMobileCoarse ? LOCKED_CAMERA_FOV.mobile : LOCKED_CAMERA_FOV.desktop;
  const orbitTarget = useMemo<[number, number, number]>(
    () => [
      0,
      isNarrowViewport ? LOCKED_CAMERA_ORBIT_TARGET_Y.mobile : LOCKED_CAMERA_ORBIT_TARGET_Y.desktop,
      0,
    ],
    [isNarrowViewport],
  );
  const handleLobbyOpen = useCallback(() => {
    if (lobbyOpening || vrStereoActive) return;

    if (invokeOpenLobbyDirect()) return;

    setLobbyOpening(true);
    window.setTimeout(() => {
      navigate(LOBBY_IMMERSIVE_PATH);
      setLobbyOpening(false);
    }, LOBBY_OPEN_TRANSITION_MS);
  }, [lobbyOpening, navigate, vrStereoActive]);

  const onColiseoClick = useCallback(() => {
    if (invokeOpenColiceoDirect()) return;
    navigate(COLOSSEO_PATH);
  }, [navigate]);

  const onLocalPlayerClick = useCallback(() => {
    if (invokeOpenGalleryDirect()) return;
    navigate("/reproductor-galeria");
  }, [navigate]);

  const onProfileConfirm = async (payload: ProfileCardConfirmPayload) => {
    try {
      localStorage.setItem(PROFILE_NAME_STORAGE_KEY, payload.name);
    } catch {
      /* ignore */
    }
    if (!onProfilePersist) return;
    setProfileSaving(true);
    try {
      await onProfilePersist(payload);
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <section
      id="mi-mundo-vr"
      className="relative h-full w-full max-w-full overflow-x-clip overflow-y-hidden bg-black"
    >
      <div className="absolute inset-0 z-[1] overflow-hidden">
        <div className="absolute inset-0 h-full w-full overflow-hidden">
        <Canvas
          className="block h-full w-full touch-none"
          dpr={vrStereoActive ? VR_STEREO_PIXEL_RATIO : [1, MAX_WEBGL_PIXEL_RATIO]}
          gl={{
            antialias: vrStereoActive ? false : !isMobileCoarse,
            alpha: !vrStereoActive,
            powerPreference: "high-performance",
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 0.96,
          }}
          frameloop="always"
          resize={{ scroll: false, debounce: { scroll: 0, resize: 0 } }}
          onCreated={({ gl }) => {
            applyPixelRatioCap(gl);
            if (!vrStereoActive) gl.setClearColor(0x000000, 0);
          }}
          camera={{ position: cameraPosition, fov: cameraFov, near: 0.1, far: 2000 }}
        >
          <PerspectiveCameraAspectSync />
          {vrStereoActive && <color attach="background" args={["#000000"]} />}
          {/* VR espejo 2D: sin luces (solo meshBasic + fondo); evita sombras y shading */}
          {!vrStereoActive &&
            (isMobileCoarse ? (
              <ambientLight intensity={0.55} />
            ) : roomMode === "equirect_interior" ? (
              <>
                <hemisphereLight args={["#fce8f4", "#181018"]} intensity={0.52} />
                <ambientLight intensity={0.34} color="#fff8fc" />
                <directionalLight position={[5, 7, 4]} intensity={1.58} color="#fff5f8" />
                <directionalLight position={[-5, -7, -4]} intensity={1.1} color="#fff5f8" />
              </>
            ) : (
              <>
                <ambientLight intensity={0.36} />
                <directionalLight position={[6, 2.5, 2]} intensity={2.02} color="#eef3fb" />
                <directionalLight position={[-6, -2.5, -2]} intensity={1.18} color="#eef3fb" />
              </>
            ))}

          <EarthMoonPivot earthSceneY={earthSceneY} scale={earthMoonScale} enabled={!vrStereoActive}>
            <Suspense fallback={null}>
              <CentralEarth
                simpleGpu={isMobileCoarse || vrStereoActive}
                vrStereo={vrStereoActive}
                onOpenLobby={vrStereoActive ? undefined : handleLobbyOpen}
              />
            </Suspense>
            <Suspense fallback={null}>
              <OrbitingMoon simpleGpu={isMobileCoarse || vrStereoActive} vrStereo={vrStereoActive} />
            </Suspense>
          </EarthMoonPivot>
          <VrStereoPerfSync active={vrStereoActive} />
        </Canvas>
        </div>
      </div>
      {!vrStereoActive && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-4">
          <div className={LOCKED_PROFILE_CARD_WRAPPER_CLASS}>
            <ProfileCard
              initialName={cardDisplayName}
              initialAvatarSrc={cardAvatarSrc}
              isSaving={profileSaving}
              onConfirm={onProfileConfirm}
              liveNavPath="/pc"
            />
          </div>
        </div>
      )}
      {!vrStereoActive && (
        <>
          <div className="pointer-events-none absolute bottom-32 right-4 z-20 flex flex-col items-center gap-3 md:bottom-6">
            <button
              type="button"
              onClick={onLocalPlayerClick}
              className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border border-blue-500/70 bg-[#1877f2] text-white shadow-[0_0_24px_rgba(24,119,242,0.55)] backdrop-blur-md transition hover:border-blue-300 hover:bg-[#2b82f6]"
              aria-label="Abrir reproductor local"
              title="Reproductor local"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden xmlns="http://www.w3.org/2000/svg">
                <path
                  fill="currentColor"
                  d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.7 15.6V8.4L16 12l-6.3 3.6z"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={onColiseoClick}
              className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border border-amber-400/50 bg-black/70 text-amber-200 shadow-[0_0_24px_rgba(251,191,36,0.25)] backdrop-blur-md transition hover:border-amber-300 hover:bg-amber-950/80 hover:text-amber-100"
              aria-label="Entrar al Coliseo Romano 360°"
              title="Coliseo Romano 360°"
            >
              <Landmark className="h-5 w-5" />
            </button>
          </div>
        </>
      )}
    </section>
  );
};

export default MiMundoVRSection;
