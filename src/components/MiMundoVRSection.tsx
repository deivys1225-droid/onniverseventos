import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
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
import MiMundoTopActionsPortal from "@/components/MiMundoTopActionsPortal";
import { MessageCircleMore } from "lucide-react";
import { CameraToggleButton, useCameraBackground } from "@/contexts/CameraBackgroundContext";
import { useVrModeActive } from "@/hooks/useVrModeActive";
import ProfileCard, { type ProfileCardConfirmPayload } from "@/components/ProfileCard";
import { useAuth } from "@/hooks/useAuth";
import SocialMenu from "@/components/SocialMenu";
import HomeNavCards from "@/components/HomeNavCards";

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
const PROFILE_NAME_STORAGE_KEY = "onniverso.profile.name";
function readStoredProfileName(): string | undefined {
  try {
    const raw = localStorage.getItem(PROFILE_NAME_STORAGE_KEY)?.trim();
    return raw || undefined;
  } catch {
    return undefined;
  }
}
/** Tierra bajo la tarjeta de perfil (posición acordada). */
const EARTH_VERTICAL_OFFSET_DESKTOP = -CENTRAL_SPHERE_RADIUS * 6.42;
const EARTH_VERTICAL_OFFSET_MOBILE = -CENTRAL_SPHERE_RADIUS * 5.17;
const ORBIT_TARGET_LIFT_DESKTOP = 1.75;
const ORBIT_TARGET_LIFT_MOBILE = 0.92;
const DEFAULT_CAMERA_POSITION_DESKTOP: [number, number, number] = [0, -0.53, 6.85];
const DEFAULT_CAMERA_POSITION_MOBILE: [number, number, number] = [0, 0.05, 6.4];
const DEFAULT_FOV_DESKTOP = 62;
const DEFAULT_FOV_MOBILE = 48;
const HOME_PROMO_BG_URL = "/onnivers-home-bg.png";

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
  const { user } = useAuth();
  const [profileSaving, setProfileSaving] = useState(false);
  const [socialMenuOpen, setSocialMenuOpen] = useState(false);
  const { cameraBgActive } = useCameraBackground();
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
  const earthVerticalOffset = isMobileCoarse ? EARTH_VERTICAL_OFFSET_MOBILE : EARTH_VERTICAL_OFFSET_DESKTOP;
  const orbitTargetLift = isMobileCoarse ? ORBIT_TARGET_LIFT_MOBILE : ORBIT_TARGET_LIFT_DESKTOP;
  const cameraPosition = isMobileCoarse ? DEFAULT_CAMERA_POSITION_MOBILE : DEFAULT_CAMERA_POSITION_DESKTOP;
  const cameraFov = isMobileCoarse ? DEFAULT_FOV_MOBILE : DEFAULT_FOV_DESKTOP;
  const orbitTarget = useMemo<[number, number, number]>(
    () => [0, earthVerticalOffset + orbitTargetLift, 0],
    [earthVerticalOffset, orbitTargetLift],
  );

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
      className={`relative h-full w-full max-w-full overflow-x-clip overflow-y-hidden ${cameraBgActive ? "bg-transparent" : "bg-black"}`}
    >
      {!vrStereoActive && !cameraBgActive && (
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
          <img
            src={HOME_PROMO_BG_URL}
            alt=""
            className="absolute inset-0 h-full w-full object-fill object-center md:object-cover"
            draggable={false}
            decoding="async"
          />
        </div>
      )}
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

          <group position={[0, earthVerticalOffset, 0]}>
            <Suspense fallback={null}>
              <CentralEarth simpleGpu={isMobileCoarse || vrStereoActive} vrStereo={vrStereoActive} />
            </Suspense>
            <Suspense fallback={null}>
              <OrbitingMoon simpleGpu={isMobileCoarse || vrStereoActive} vrStereo={vrStereoActive} />
            </Suspense>
          </group>

          <OrbitControls
            makeDefault
            enabled={!vrStereoActive}
            target={orbitTarget}
            enablePan={false}
            enableDamping
            dampingFactor={0.06}
            rotateSpeed={0.65}
            minDistance={3.2}
            maxDistance={12}
            minPolarAngle={0.02}
            maxPolarAngle={Math.PI - 0.02}
          />
          <VrStereoPerfSync active={vrStereoActive} />
        </Canvas>
        </div>
      </div>
      {!vrStereoActive && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-4">
          <div className="pointer-events-auto w-full max-w-[min(92vw,280px)] origin-center scale-[0.605] -translate-y-[clamp(2.5rem,14vh,6.5rem)] md:-translate-y-[clamp(5.2rem,25vh,13.5rem)]">
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
      {!vrStereoActive && <HomeNavCards />}
      {!vrStereoActive && (
        <>
          <MiMundoTopActionsPortal
            socialMenuOpen={socialMenuOpen}
            onToggleSocial={() => setSocialMenuOpen((prev) => !prev)}
          />
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
      <CameraToggleButton />
    </section>
  );
};

export default MiMundoVRSection;
