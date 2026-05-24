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
  fitDepth,
  prepareModel,
}: {
  url: string;
  width: number;
  height: number;
  fitDepth: boolean;
  prepareModel?: (root: THREE.Object3D) => void;
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
    const fitScale = fitDepth
      ? Math.min(
          (width * 0.92) / Math.max(size.x, 1e-6),
          (height * 0.92) / Math.max(size.y, 1e-6),
          (width * 0.92) / Math.max(size.z, 1e-6),
        )
      : Math.min(
          (width * 0.92) / Math.max(size.x, 1e-6),
          (height * 0.92) / Math.max(size.y, 1e-6),
        );
    root.scale.setScalar(fitScale);
    prepareModel?.(root);
    return root;
  }, [scene, url, width, height, fitDepth, prepareModel]);

  return <primitive object={model} raycast={() => null} />;
}

export function WallSceneGlb({
  url,
  position,
  rotation,
  scaleMultiplier = 1,
  fitDepth = true,
  spin = true,
  prepareModel,
}: {
  url: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scaleMultiplier?: number;
  /** true = escala original (corazón); false = solo ancho/alto de pared (modelos alargados). */
  fitDepth?: boolean;
  /** Rotación lenta en Y (corazón). Desactivar para objetos fijos como faroles. */
  spin?: boolean;
  prepareModel?: (root: THREE.Object3D) => void;
}) {
  const spinRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!spin || !spinRef.current) return;
    spinRef.current.rotation.y += delta * 0.35;
  });

  return (
    <group position={position} rotation={rotation}>
      <group ref={spinRef} scale={scaleMultiplier}>
        <Suspense fallback={null}>
          <WallSceneGlbModel
            key={url}
            url={url}
            width={WALL_PANEL_WIDTH}
            height={WALL_PANEL_HEIGHT}
            fitDepth={fitDepth}
            prepareModel={prepareModel}
          />
        </Suspense>
      </group>
    </group>
  );
}
