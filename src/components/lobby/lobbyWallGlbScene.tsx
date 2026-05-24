import { Suspense, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

const WALL_PANEL_WIDTH = 8;
const WALL_PANEL_HEIGHT = 4.5;

function WallSceneGlbModel({
  url,
  width,
  height,
}: {
  url: string;
  width: number;
  height: number;
}) {
  const { scene } = useGLTF(url, false, false, (loader) => {
    loader.setCrossOrigin("anonymous");
  });
  const model = useMemo(() => {
    const root = scene.clone(true);
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    root.position.sub(center);
    const fitScale = Math.min(
      (width * 0.92) / Math.max(size.x, 1e-6),
      (height * 0.92) / Math.max(size.y, 1e-6),
      (width * 0.92) / Math.max(size.z, 1e-6),
    );
    root.scale.setScalar(fitScale);
    return root;
  }, [scene, url, width, height]);

  return <primitive object={model} raycast={() => null} />;
}

export function WallSceneGlb({
  url,
  position,
  rotation,
  scaleMultiplier = 1,
}: {
  url: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scaleMultiplier?: number;
}) {
  const spinRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!spinRef.current) return;
    spinRef.current.rotation.y += delta * 0.35;
  });

  return (
    <group position={position} rotation={rotation}>
      <group ref={spinRef} scale={scaleMultiplier}>
        <Suspense fallback={null}>
          <WallSceneGlbModel key={url} url={url} width={WALL_PANEL_WIDTH} height={WALL_PANEL_HEIGHT} />
        </Suspense>
      </group>
    </group>
  );
}
