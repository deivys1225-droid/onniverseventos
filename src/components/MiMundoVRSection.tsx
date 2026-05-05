import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Billboard, DeviceOrientationControls, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import {
  getRoomMode,
  MI_MUNDO_ENV_STORAGE_KEY,
  normalizeStoredEnvironmentId,
  type MiMundoEnvironmentId,
} from "@/data/miMundoEnvironments";
import {
  MAX_WEBGL_PIXEL_RATIO,
  VR_STEREO_PIXEL_RATIO,
  applyPixelRatioCap,
  getAdaptiveSphereSegments,
  isMobileCoarseDevice,
} from "@/lib/webglRendererPrefs";
import { useVrModeActive } from "@/hooks/useVrModeActive";

/** Texturas Tierra alta resolucion (three.js, estilo vista espacial tipo Artemis); radio sin cambios. */
const PLANETS = "https://cdn.jsdelivr.net/gh/mrdoob/three.js@dev/examples/textures/planets";
const EARTH_DAY_4K = `${PLANETS}/earth_day_4096.jpg`;
const EARTH_NORMAL = `${PLANETS}/earth_normal_2048.jpg`;
const EARTH_SPECULAR = `${PLANETS}/earth_specular_2048.jpg`;
const EARTH_CLOUDS = `${PLANETS}/earth_clouds_1024.png`;

/** Tierra y luna al 50% del tamano anterior. */
const CENTRAL_SPHERE_RADIUS = 0.925;

/** Textura ligera 360° de estadio de futbol (equirectangular, optimizada para mobile). */
const STADIUM_PANORAMA_URL =
  "/estadio.jpg";

/** Luna: textura ligera + parametros de orbita. */
const MOON_TEXTURE_URL = `${PLANETS}/moon_1024.jpg`;
const MOON_RADIUS = CENTRAL_SPHERE_RADIUS * 0.27;
const MOON_ORBIT_RADIUS = CENTRAL_SPHERE_RADIUS * 1.95;
const MOON_ORBIT_SPEED = 0.22;
const EARTH_ROTATION_SPEED = 0.08;
const FREE_MATCH_VIDEO_URL =
  (import.meta.env.VITE_FREE_MATCH_VIDEO_URL as string | undefined)?.trim() ||
  "/videos/beele.mp4";
const SECOND_MATCH_VIDEO_URL =
  (import.meta.env.VITE_SECOND_MATCH_VIDEO_URL as string | undefined)?.trim() || "/videos/colombia-argentina-resumen.mp4";
const WINDOWS11_DESKTOP_URL =
  "https://images.unsplash.com/photo-1633419461186-7d40a38105ec?auto=format&fit=crop&w=1600&q=80";

function createVideoTexture(url: string) {
  if (typeof document === "undefined") return { video: null, texture: null as THREE.VideoTexture | null };
  const video = document.createElement("video");
  video.src = url;
  video.crossOrigin = "anonymous";
  video.loop = true;
  video.muted = true;
  video.autoplay = true;
  video.playsInline = true;
  video.preload = "auto";
  const texture = new THREE.VideoTexture(video);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return { video, texture };
}

function MoonScreenCluster({
  visible,
  screenRefs,
  vrMirrorFlat,
}: {
  visible: boolean;
  /** Mismo canvas 2D: planos que miran a la cámara, sin profundidad de escena. */
  vrMirrorFlat: boolean;
}) {
  const clusterRef = useRef<THREE.Group>(null);
  const [mainVideo] = useState(() => createVideoTexture(FREE_MATCH_VIDEO_URL));
  const [secondVideo] = useState(() => createVideoTexture(SECOND_MATCH_VIDEO_URL));
  const systemTexture = useLoader(THREE.TextureLoader, WINDOWS11_DESKTOP_URL);

  const socialTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bg.addColorStop(0, "rgba(18,34,55,0.95)");
    bg.addColorStop(1, "rgba(9,18,30,0.95)");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(168, 232, 255, 0.6)";
    ctx.lineWidth = 5;
    ctx.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);

    ctx.fillStyle = "rgba(210, 244, 255, 0.22)";
    ctx.fillRect(28, 32, canvas.width - 56, 68);

    ctx.font = "700 44px Arial";
    ctx.fillStyle = "#dbf4ff";
    ctx.fillText("SOCIAL GLASS", 44, 78);

    const items = [
      {
        label: "Facebook",
        color: "#1877f2",
        x: 70,
        y: 150,
        iconUrl: "https://cdn.simpleicons.org/facebook/ffffff",
      },
      {
        label: "WhatsApp",
        color: "#25D366",
        x: 350,
        y: 150,
        iconUrl: "https://cdn.simpleicons.org/whatsapp/ffffff",
      },
      {
        label: "Instagram",
        color: "#E4405F",
        x: 630,
        y: 150,
        iconUrl: "https://cdn.simpleicons.org/instagram/ffffff",
      },
      {
        label: "Spotify",
        color: "#1ED760",
        x: 210,
        y: 296,
        iconUrl: "https://cdn.simpleicons.org/spotify/ffffff",
      },
      {
        label: "TikTok",
        color: "#00f2ea",
        x: 490,
        y: 296,
        iconUrl: "https://cdn.simpleicons.org/tiktok/ffffff",
      },
    ];

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    const drawItem = (item: (typeof items)[number]) => {
      ctx.fillStyle = "rgba(240, 250, 255, 0.14)";
      ctx.beginPath();
      ctx.roundRect(item.x, item.y, 250, 110, 22);
      ctx.fill();
      ctx.strokeStyle = `${item.color}cc`;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = item.color;
      ctx.font = "700 28px Arial";
      ctx.fillText(item.label, item.x + 82, item.y + 66);
    };

    items.forEach(drawItem);

    // Cargar iconos oficiales y pintar encima de cada tarjeta.
    items.forEach((item) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        ctx.fillStyle = `${item.color}cc`;
        ctx.beginPath();
        ctx.roundRect(item.x + 16, item.y + 16, 50, 50, 12);
        ctx.fill();
        ctx.drawImage(img, item.x + 25, item.y + 25, 32, 32);
        texture.needsUpdate = true;
      };
      img.src = item.iconUrl;
    });

    return texture;
  }, []);

  useEffect(() => {
    systemTexture.colorSpace = THREE.SRGBColorSpace;
    systemTexture.anisotropy = 8;
  }, [systemTexture]);

  useEffect(() => {
    const tryPlay = (video: HTMLVideoElement | null) => {
      if (!video) return;
      void video.play().catch(() => undefined);
    };
    if (visible) {
      tryPlay(mainVideo.video);
      tryPlay(secondVideo.video);
      const resume = () => {
        tryPlay(mainVideo.video);
        tryPlay(secondVideo.video);
      };
      window.addEventListener("pointerdown", resume, { once: true });
      window.addEventListener("touchstart", resume, { once: true });
      return () => {
        window.removeEventListener("pointerdown", resume);
        window.removeEventListener("touchstart", resume);
      };
    }
    mainVideo.video?.pause();
    secondVideo.video?.pause();
    return undefined;
  }, [mainVideo.video, secondVideo.video, visible]);

  useEffect(() => {
    return () => {
      mainVideo.texture?.dispose();
      secondVideo.texture?.dispose();
      socialTexture?.dispose();
      systemTexture?.dispose();
    };
  }, [mainVideo.texture, secondVideo.texture, socialTexture, systemTexture]);

  useFrame((_, delta) => {
    if (!clusterRef.current) return;
    const target = visible ? 1 : 0;
    const scale = THREE.MathUtils.damp(clusterRef.current.scale.x, target, 9, delta);
    clusterRef.current.scale.setScalar(scale);
  });

  const enableAudioFor = (video: HTMLVideoElement | null) => {
    if (!video) return;
    video.muted = false;
    video.defaultMuted = false;
    video.removeAttribute("muted");
    video.volume = 1;
    void video.play().catch(() => undefined);
  };

  if (vrMirrorFlat) {
    return (
      <group ref={clusterRef}>
        <Billboard position={[0, 0.18, 1.35]} follow>
          <mesh renderOrder={6}>
            <planeGeometry args={[2.9, 1.72]} />
            <meshBasicMaterial map={socialTexture ?? undefined} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        </Billboard>
        <Billboard position={[0, 0.18, -1.35]} follow>
          <mesh
            renderOrder={6}
            onPointerDown={(event) => {
              event.stopPropagation();
              enableAudioFor(secondVideo.video);
            }}
          >
            <planeGeometry args={[2.9, 1.72]} />
            <meshBasicMaterial map={secondVideo.texture ?? undefined} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        </Billboard>
        <Billboard position={[-1.35, 0.18, 0]} follow>
          <mesh
            renderOrder={6}
            onPointerDown={(event) => {
              event.stopPropagation();
              enableAudioFor(mainVideo.video);
            }}
          >
            <planeGeometry args={[2.9, 1.72]} />
            <meshBasicMaterial map={mainVideo.texture ?? undefined} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        </Billboard>
        <Billboard position={[1.35, 0.18, 0]} follow>
          <mesh renderOrder={6}>
            <planeGeometry args={[3, 1.8]} />
            <meshBasicMaterial map={systemTexture ?? undefined} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        </Billboard>
      </group>
    );
  }

  return (
    <group ref={clusterRef}>
      <mesh
        position={[0, 0.18, 1.35]}
        renderOrder={6}
      >
        <planeGeometry args={[2.9, 1.72]} />
        <meshBasicMaterial map={socialTexture ?? undefined} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh
        position={[0, 0.18, -1.35]}
        rotation={[0, Math.PI, 0]}
        renderOrder={6}
        onPointerDown={(event) => {
          event.stopPropagation();
          enableAudioFor(secondVideo.video);
        }}
      >
        <planeGeometry args={[2.9, 1.72]} />
        <meshBasicMaterial map={secondVideo.texture ?? undefined} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh
        position={[-1.35, 0.18, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        renderOrder={6}
        onPointerDown={(event) => {
          event.stopPropagation();
          enableAudioFor(mainVideo.video);
        }}
      >
        <planeGeometry args={[2.9, 1.72]} />
        <meshBasicMaterial map={mainVideo.texture ?? undefined} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh
        position={[1.35, 0.18, 0]}
        rotation={[0, Math.PI / 2, 0]}
        renderOrder={6}
      >
        <planeGeometry args={[3, 1.8]} />
        <meshBasicMaterial map={systemTexture ?? undefined} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function OrbitingMoon({
  moonRef,
  simpleGpu,
  vrStereo,
}: {
  moonRef: React.RefObject<THREE.Mesh>;
  simpleGpu: boolean;
  vrStereo: boolean;
}) {
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
      <mesh ref={moonRef} position={[MOON_ORBIT_RADIUS, -1.24, 0]} key={`moon-${moonSeg}`}>
        <sphereGeometry args={[MOON_RADIUS, moonSeg, moonSeg]} />
        <meshBasicMaterial map={moonTexture} toneMapped transparent opacity={1} />
      </mesh>
    </group>
  );
}

function SpaceBackground({ roomTextureUrl, vrStereo }: { roomTextureUrl: string; vrStereo: boolean }) {
  const texture = useLoader(THREE.TextureLoader, roomTextureUrl);
  const { scene } = useThree();

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.anisotropy = vrStereo ? 1 : 8;
    scene.background = texture;
    return () => {
      if (scene.background === texture) scene.background = null;
    };
  }, [scene, texture, vrStereo]);

  return null;
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

/** Planeta Tierra central: texturas/material; posicion, radio y orbita intactos. */
function CentralEarth({
  simpleGpu,
  vrStereo,
}: {
  simpleGpu: boolean;
  vrStereo: boolean;
}) {
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
    if (earthRef.current) {
      earthRef.current.rotation.y += delta * EARTH_ROTATION_SPEED;
    }
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

function readStoredEnvironmentId(): MiMundoEnvironmentId | null {
  try {
    const raw = localStorage.getItem(MI_MUNDO_ENV_STORAGE_KEY);
    return normalizeStoredEnvironmentId(raw);
  } catch {
    /* ignore */
  }
  return null;
}

const MiMundoVRSection = () => {
  const [gyroEnabled, setGyroEnabled] = useState(false);
  const vrStereoActive = useVrModeActive();
  const moonRef = useRef<THREE.Mesh>(null);
  const environmentId = useMemo<MiMundoEnvironmentId>(() => {
    if (typeof window === "undefined") return "lobby";
    return readStoredEnvironmentId() ?? "lobby";
  }, []);

  const roomMode = useMemo(() => getRoomMode(environmentId), [environmentId]);

  const isMobileCoarse = useMemo(() => isMobileCoarseDevice(), []);

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
    <section id="mi-mundo-vr" className="relative h-[100dvh] w-full overflow-hidden bg-black">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0">
        <Canvas
          dpr={vrStereoActive ? VR_STEREO_PIXEL_RATIO : [1, MAX_WEBGL_PIXEL_RATIO]}
          gl={{
            antialias: vrStereoActive ? false : !isMobileCoarse,
            alpha: false,
            powerPreference: "high-performance",
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 0.96,
          }}
          frameloop="always"
          onCreated={({ gl }) => {
            applyPixelRatioCap(gl);
          }}
          camera={{ position: [0, 0, 5.8], fov: 62, near: 0.1, far: 2000 }}
        >
          <color attach="background" args={roomMode === "equirect_interior" ? ["#0c0812"] : ["#02030a"]} />
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

          {/* Fondo: solo textura en scene.background (0 geometría de esfera). */}
          <Suspense fallback={null}>
            <SpaceBackground roomTextureUrl={STADIUM_PANORAMA_URL} vrStereo={vrStereoActive} />
          </Suspense>
          <Suspense fallback={null}>
            <CentralEarth
              simpleGpu={isMobileCoarse || vrStereoActive}
              vrStereo={vrStereoActive}
            />
          </Suspense>
          <Suspense fallback={null}>
            <OrbitingMoon
              moonRef={moonRef}
              simpleGpu={isMobileCoarse || vrStereoActive}
              vrStereo={vrStereoActive}
            />
          </Suspense>
          <Suspense fallback={null}>
            <MoonScreenCluster
              visible={false}
              vrMirrorFlat={vrStereoActive}
            />
          </Suspense>

          <OrbitControls
            makeDefault
            enabled={!vrStereoActive && !gyroEnabled}
            target={[0, 0, 0]}
            enablePan={false}
            enableDamping
            dampingFactor={0.06}
            rotateSpeed={0.65}
            minDistance={3.2}
            maxDistance={12}
            minPolarAngle={0.02}
            maxPolarAngle={Math.PI - 0.02}
          />
          <DeviceGyroController enabled={!vrStereoActive && gyroEnabled} />
          <VrStereoPerfSync active={vrStereoActive} />
        </Canvas>
        </div>
      </div>

    </section>
  );
};

export default MiMundoVRSection;
