import { useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { getAdaptiveSphereSegments, isMobileCoarseDevice } from "@/lib/webglRendererPrefs";

const EARTH_TEXTURES_BASE = "/assets/textures/earth";
const EARTH_DAY = `${EARTH_TEXTURES_BASE}/earth_day_4096.jpg`;
const EARTH_NORMAL = `${EARTH_TEXTURES_BASE}/earth_normal_2048.jpg`;
const EARTH_SPECULAR = `${EARTH_TEXTURES_BASE}/earth_specular_2048.jpg`;
const EARTH_CLOUDS = `${EARTH_TEXTURES_BASE}/earth_clouds_1024.png`;
const MOON_TEXTURE = "/assets/textures/moon/moon_1024.jpg";

/** Decoración central del lobby: más compacta que el inicio. */
const EARTH_RADIUS = 0.72;
const MOON_RADIUS = EARTH_RADIUS * 0.27;
const MOON_ORBIT_RADIUS = EARTH_RADIUS * 1.95;
const EARTH_SPIN_SPEED = 0.08;
const MOON_ORBIT_SPEED = 0.22;

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

function LobbyDecorMoon({ simpleGpu }: { simpleGpu: boolean }) {
  const pivotRef = useRef<THREE.Group>(null);
  const moonTexture = useLoader(THREE.TextureLoader, MOON_TEXTURE);
  const seg = useMemo(() => getAdaptiveSphereSegments(false), []);

  useEffect(() => {
    moonTexture.colorSpace = THREE.SRGBColorSpace;
    moonTexture.anisotropy = simpleGpu ? 2 : 8;
  }, [moonTexture, simpleGpu]);

  useFrame((_, delta) => {
    if (pivotRef.current) pivotRef.current.rotation.y += delta * MOON_ORBIT_SPEED;
  });

  return (
    <group ref={pivotRef} rotation={[0.18, 0, 0]}>
      <mesh
        raycast={() => null}
        position={[MOON_ORBIT_RADIUS, -0.45, 0]}
        key={`lobby-moon-${seg}`}
      >
        <sphereGeometry args={[MOON_RADIUS, seg, seg]} />
        <meshBasicMaterial map={moonTexture} toneMapped transparent opacity={1} />
      </mesh>
    </group>
  );
}

function LobbyDecorEarth({ simpleGpu }: { simpleGpu: boolean }) {
  const earthRef = useRef<THREE.Group>(null);
  const [dayMap, normalMap, specularMap, cloudsMap] = useLoader(THREE.TextureLoader, [
    EARTH_DAY,
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
    const antisoBase = simpleGpu ? 4 : 16;
    const antisoCloud = simpleGpu ? 2 : 12;
    dayMap.colorSpace = THREE.SRGBColorSpace;
    dayMap.anisotropy = antisoBase;
    dayMap.minFilter = THREE.LinearMipmapLinearFilter;
    dayMap.magFilter = THREE.LinearFilter;
    normalMap.colorSpace = THREE.NoColorSpace;
    normalMap.anisotropy = antisoBase;
    specularMap.colorSpace = THREE.NoColorSpace;
    cloudsMap.colorSpace = THREE.SRGBColorSpace;
    cloudsMap.anisotropy = antisoCloud;
  }, [dayMap, normalMap, specularMap, cloudsMap, simpleGpu]);

  useFrame((_, delta) => {
    if (earthRef.current) earthRef.current.rotation.y += delta * EARTH_SPIN_SPEED;
  });

  const seg = useMemo(() => getAdaptiveSphereSegments(false), []);

  if (simpleGpu) {
    return (
      <group ref={earthRef} key={`lobby-earth-s-${seg}`}>
        <mesh raycast={() => null} renderOrder={0}>
          <sphereGeometry args={[EARTH_RADIUS, seg, seg]} />
          <meshBasicMaterial map={dayMap} toneMapped />
        </mesh>
        <mesh raycast={() => null} renderOrder={1} scale={1.0018}>
          <sphereGeometry args={[EARTH_RADIUS, seg, seg]} />
          <meshBasicMaterial map={cloudsMap} transparent opacity={0.92} depthWrite={false} toneMapped />
        </mesh>
        <mesh raycast={() => null} renderOrder={2} scale={1.024}>
          <sphereGeometry args={[EARTH_RADIUS, seg, seg]} />
          <meshBasicMaterial
            color="#6ab4ff"
            transparent
            opacity={0.085}
            depthWrite={false}
            blending={THREE.NormalBlending}
          />
        </mesh>
      </group>
    );
  }

  return (
    <group ref={earthRef} key={`lobby-earth-hd-${seg}`}>
      <mesh raycast={() => null} renderOrder={0}>
        <sphereGeometry args={[EARTH_RADIUS, seg, seg]} />
        <meshStandardMaterial
          map={dayMap}
          normalMap={normalMap}
          normalScale={new THREE.Vector2(0.045, 0.045)}
          roughnessMap={roughnessMap ?? undefined}
          roughness={1}
          metalness={0.06}
          toneMapped
        />
      </mesh>
      <mesh raycast={() => null} renderOrder={1} scale={1.0018}>
        <sphereGeometry args={[EARTH_RADIUS, seg, seg]} />
        <meshStandardMaterial
          map={cloudsMap}
          transparent
          opacity={0.92}
          depthWrite={false}
          roughness={1}
          metalness={0}
          toneMapped
        />
      </mesh>
      <mesh raycast={() => null} renderOrder={2} scale={1.024}>
        <sphereGeometry args={[EARTH_RADIUS, seg, seg]} />
        <meshBasicMaterial
          color="#6ab4ff"
          transparent
          opacity={0.085}
          depthWrite={false}
          blending={THREE.NormalBlending}
        />
      </mesh>
    </group>
  );
}

/**
 * Tierra + Luna decorativas en el lobby (sin interacción).
 * Por defecto junto a la pared derecha (+X), fuera del centro de las pantallas.
 */
export default function LobbyDecorEarthMoon({
  position = [7.85, 3.6, 0],
  scale = 1.26,
}: {
  position?: [number, number, number];
  scale?: number;
}) {
  const simpleGpu = isMobileCoarseDevice();

  return (
    <group position={position} scale={scale}>
      <LobbyDecorEarth simpleGpu={simpleGpu} />
      <LobbyDecorMoon simpleGpu={simpleGpu} />
    </group>
  );
}
