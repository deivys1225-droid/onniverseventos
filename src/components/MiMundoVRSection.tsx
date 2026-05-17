import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { DeviceOrientationControls, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
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
import { MessageCircleMore, UsersRound } from "lucide-react";
import { CameraToggleButton, useCameraBackground } from "@/contexts/CameraBackgroundContext";
import { useVrModeActive } from "@/hooks/useVrModeActive";
import ProfileCard, { type ProfileCardConfirmPayload } from "@/components/ProfileCard";
import { useAuth } from "@/hooks/useAuth";
import SocialMenu from "@/components/SocialMenu";

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

/** Tierra y luna al 50% del tamano anterior. */
const CENTRAL_SPHERE_RADIUS = 0.925;

/** Luna: textura local ligera + parametros de orbita. */
const MOON_TEXTURE_URL = "/assets/textures/moon/moon_1024.jpg";
const MOON_RADIUS = CENTRAL_SPHERE_RADIUS * 0.27;
const MOON_ORBIT_RADIUS = CENTRAL_SPHERE_RADIUS * 1.95;
const MOON_ORBIT_SPEED = 0.22;
const EARTH_ROTATION_SPEED = 0.08;
const MI_MUNDO_CAMERA_VIEW_STORAGE_KEY = "onniverso.mi_mundo.camera_view";
const PROFILE_NAME_STORAGE_KEY = "onniverso.profile.name";
function readStoredProfileName(): string | undefined {
  try {
    const raw = localStorage.getItem(PROFILE_NAME_STORAGE_KEY)?.trim();
    return raw || undefined;
  } catch {
    return undefined;
  }
}
/** Desplazamiento vertical del planeta (~20% hacia abajo en pantalla). */
const EARTH_VERTICAL_OFFSET = -CENTRAL_SPHERE_RADIUS * 2.88;
const DEFAULT_CAMERA_POSITION: [number, number, number] = [0, 0, 5.8];
const DEFAULT_ORBIT_TARGET: [number, number, number] = [0, EARTH_VERTICAL_OFFSET, 0];
const HOME_PROMO_BG_URL = "/onnivers-home-bg.png";

type StoredCameraView = {
  position: [number, number, number];
  target: [number, number, number];
};

function readStoredCameraView(): StoredCameraView | null {
  try {
    const raw = localStorage.getItem(MI_MUNDO_CAMERA_VIEW_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredCameraView>;
    if (
      !Array.isArray(parsed.position) ||
      parsed.position.length !== 3 ||
      !Array.isArray(parsed.target) ||
      parsed.target.length !== 3
    ) {
      return null;
    }
    const nums = [...parsed.position, ...parsed.target];
    if (!nums.every((value) => Number.isFinite(value))) return null;
    return {
      position: parsed.position as [number, number, number],
      target: parsed.target as [number, number, number],
    };
  } catch {
    return null;
  }
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
    <group ref={pivotRef} rotation={[0.18, 0, 0]}>
      <mesh position={[MOON_ORBIT_RADIUS, -0.45, 0]} key={`moon-${moonSeg}`}>
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

/** Planeta Tierra central: solo visual (sin interacción de lobby). */
function CentralEarth({ simpleGpu, vrStereo }: { simpleGpu: boolean; vrStereo: boolean }) {
  const earthRef = useRef<THREE.Group>(null);
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
    earthRef.current.rotation.y += delta * EARTH_ROTATION_SPEED;
  });

  const seg = useMemo(() => getAdaptiveSphereSegments(vrStereo), [vrStereo]);

  if (simpleGpu) {
    return (
      <group ref={earthRef} key={`earth-s-${seg}`}>
        <mesh renderOrder={0}>
          <sphereGeometry args={[CENTRAL_SPHERE_RADIUS, seg, seg]} />
          <meshBasicMaterial map={dayMap} toneMapped />
        </mesh>
        <mesh renderOrder={1} scale={1.0018}>
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
      <mesh renderOrder={0}>
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
      <mesh renderOrder={1} scale={1.0018}>
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

function DeviceGyroController({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;
  return <DeviceOrientationControls />;
}

/** Stereo VR / capture mode: DPR 1, sin tone mapping tipo ACES (menos trabajo por frame). */
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
  const { user } = useAuth();
  const [gyroEnabled, setGyroEnabled] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [socialMenuOpen, setSocialMenuOpen] = useState(false);
  const { cameraBgActive } = useCameraBackground();
  const vrStereoActive = useVrModeActive();
  const environmentId = useMemo<MiMundoEnvironmentId>(() => "lobby", []);
  const storedCameraView = useMemo(
    () => (typeof window === "undefined" ? null : readStoredCameraView()),
    [],
  );
  const storedProfileName = useMemo(
    () => (typeof window === "undefined" ? undefined : readStoredProfileName()),
    [],
  );

  const cardDisplayName =
    profileDisplayName?.trim() || storedProfileName || "Explorador VR";
  const cardAvatarSrc = profileAvatarUrl?.trim() || "/placeholder.svg";

  const roomMode = useMemo(() => getRoomMode(environmentId), [environmentId]);

  const isMobileCoarse = useMemo(() => isMobileCoarseDevice(), []);
  const cameraPosition = storedCameraView?.position ?? DEFAULT_CAMERA_POSITION;
  const orbitTarget = storedCameraView?.target ?? DEFAULT_ORBIT_TARGET;

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

  const onOrbitEnd = (event: { target?: { object?: THREE.Camera; target?: THREE.Vector3 } }) => {
    if (typeof window === "undefined") return;
    const controlsTarget = event.target;
    if (!controlsTarget?.object || !controlsTarget?.target) return;
    const camera = controlsTarget.object;
    const target = controlsTarget.target;
    const payload: StoredCameraView = {
      position: [camera.position.x, camera.position.y, camera.position.z],
      target: [target.x, target.y, target.z],
    };
    localStorage.setItem(MI_MUNDO_CAMERA_VIEW_STORAGE_KEY, JSON.stringify(payload));
  };

  const enableGyroscope = async () => {
    if (typeof window === "undefined") return;

    const maybeDeviceOrientation = window.DeviceOrientationEvent as
      | (typeof DeviceOrientationEvent & { requestPermission?: () => Promise<"granted" | "denied"> })
      | undefined;

    if (maybeDeviceOrientation?.requestPermission) {
      const permission = await maybeDeviceOrientation.requestPermission();
      if (permission !== "granted") return;
    }

    setGyroEnabled(true);
  };

  return (
    <section
      id="mi-mundo-vr"
      className={`relative h-full w-full max-w-full overflow-x-clip overflow-y-hidden ${cameraBgActive ? "bg-transparent" : "bg-black"}`}
    >
      {!vrStereoActive && !cameraBgActive && (
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
          <img
            src={HOME_PROMO_BG_URL}
            alt=""
            className="absolute inset-0 h-full w-full max-w-full object-cover object-center"
            draggable={false}
            decoding="async"
          />
        </div>
      )}
      <div className="absolute inset-0 z-[1]">
        <div className="absolute inset-0">
        <Canvas
          dpr={vrStereoActive ? VR_STEREO_PIXEL_RATIO : [1, MAX_WEBGL_PIXEL_RATIO]}
          gl={{
            antialias: vrStereoActive ? false : !isMobileCoarse,
            alpha: !vrStereoActive,
            powerPreference: "high-performance",
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 0.96,
          }}
          frameloop="always"
          onCreated={({ gl }) => {
            applyPixelRatioCap(gl);
            if (!vrStereoActive) gl.setClearColor(0x000000, 0);
          }}
          camera={{ position: cameraPosition, fov: 62, near: 0.1, far: 2000 }}
        >
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

          <group position={[0, EARTH_VERTICAL_OFFSET, 0]}>
            <Suspense fallback={null}>
              <CentralEarth simpleGpu={isMobileCoarse || vrStereoActive} vrStereo={vrStereoActive} />
            </Suspense>
            <Suspense fallback={null}>
              <OrbitingMoon simpleGpu={isMobileCoarse || vrStereoActive} vrStereo={vrStereoActive} />
            </Suspense>
          </group>

          <OrbitControls
            makeDefault
            enabled={!vrStereoActive && !gyroEnabled}
            target={orbitTarget}
            enablePan={false}
            enableDamping
            dampingFactor={0.06}
            rotateSpeed={0.65}
            minDistance={3.2}
            maxDistance={12}
            minPolarAngle={0.02}
            maxPolarAngle={Math.PI - 0.02}
            onEnd={onOrbitEnd}
          />
          <DeviceGyroController enabled={!vrStereoActive && gyroEnabled} />
          <VrStereoPerfSync active={vrStereoActive} />
        </Canvas>
        </div>
      </div>
      {!vrStereoActive && (
        <div className="pointer-events-none absolute inset-x-0 top-16 bottom-0 z-10 flex items-center justify-center overflow-hidden px-3 sm:px-4">
          <div className="pointer-events-auto w-full max-w-[min(calc(100vw-1.5rem),240px)] origin-center -translate-y-[clamp(1.75rem,9vh,5rem)] sm:max-w-[min(calc(100vw-2rem),260px)] sm:-translate-y-[clamp(2.5rem,12vh,7rem)] md:max-w-[280px] md:scale-[0.63] md:-translate-y-[clamp(3.94rem,19.15vh,11.26rem)]">
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
          <div className="pointer-events-none fixed top-20 right-4 z-[60] flex flex-col items-end gap-2 pt-[env(safe-area-inset-top,0px)] pr-[env(safe-area-inset-right,0px)]">
            <button
              type="button"
              onClick={() => setSocialMenuOpen((prev) => !prev)}
              aria-label={socialMenuOpen ? "Cerrar Messenger" : "Abrir Messenger"}
              aria-expanded={socialMenuOpen}
              className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-cyan-400/60 bg-slate-950/95 text-cyan-200 shadow-[0_0_28px_-4px_rgba(34,211,238,0.95),inset_0_0_18px_-10px_rgba(34,211,238,0.55)] transition hover:border-cyan-300 hover:bg-slate-900 hover:text-white hover:shadow-[0_0_34px_-2px_rgba(34,211,238,1)]"
            >
              <UsersRound className="h-5 w-5" />
            </button>
          </div>
          <CameraToggleButton />
          {user && (
            <SocialMenu userId={user.id} open={socialMenuOpen} onClose={() => setSocialMenuOpen(false)} />
          )}
          {!user && socialMenuOpen && (
            <div className="pointer-events-auto fixed top-32 right-4 z-[70] max-w-[min(92vw,280px)] rounded-xl border border-cyan-300/35 bg-card/90 px-3 py-2 text-xs text-cyan-100 backdrop-blur-xl">
              <MessageCircleMore className="mr-1 inline h-3.5 w-3.5" />
              Inicia sesion para usar Social.
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default MiMundoVRSection;
