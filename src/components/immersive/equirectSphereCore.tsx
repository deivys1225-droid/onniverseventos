import { OrbitControls } from "@react-three/drei";
import { useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { SRGBColorSpace, TextureLoader } from "three";
import { OPTIMIZED_SPHERE_SEGMENTS } from "@/lib/webglRendererPrefs";

export const SPHERE_RADIUS = 420;

/** Esfera con textura equirectangular en el interior (BackSide). */
export function EquirectangularInterior({
  url,
  ...meshProps
}: { url: string } & JSX.IntrinsicElements["mesh"]) {
  const texture = useLoader(TextureLoader, url, (loader) => {
    loader.setCrossOrigin("anonymous");
  });
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  return (
    <mesh {...meshProps}>
      <sphereGeometry args={[SPHERE_RADIUS, OPTIMIZED_SPHERE_SEGMENTS, OPTIMIZED_SPHERE_SEGMENTS]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} depthWrite={false} />
    </mesh>
  );
}

export function ImmersiveOrbitControls({ enabled = true }: { enabled?: boolean }) {
  return (
    <OrbitControls
      makeDefault
      enabled={enabled}
      enablePan={false}
      enableZoom
      enableDamping
      dampingFactor={0.055}
      rotateSpeed={0.28}
      minPolarAngle={0.02}
      maxPolarAngle={Math.PI - 0.02}
      minAzimuthAngle={-Infinity}
      maxAzimuthAngle={Infinity}
      target={[0, 0, 0]}
      minDistance={0.08}
      maxDistance={0.45}
    />
  );
}
