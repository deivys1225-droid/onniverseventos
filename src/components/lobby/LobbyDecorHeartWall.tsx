import { useCallback, useEffect } from "react";
import { useLoader } from "@react-three/fiber";
import { GALERIA_3D_MODELS } from "@/lib/galeria3dModels";
import { WallSceneGlb } from "@/components/lobby/lobbyWallGlbScene";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

const HEART_URL =
  GALERIA_3D_MODELS.find((model) => model.id === "corazon")?.modelUrl ?? "/assets/models/corazon.glb";

/** Textura de color extraída del GLB (rojo + arterias amarillas). El loader ya no aplica KHR_materials_pbrSpecularGlossiness. */
const HEART_DIFFUSE_URL = "/assets/models/corazon-diffuse.png";

useGLTF.preload(HEART_URL);

type LobbyDecorHeartWallProps = {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scaleMultiplier?: number;
};

function useHeartWallMaterials() {
  const diffuseMap = useLoader(THREE.TextureLoader, HEART_DIFFUSE_URL);

  useEffect(() => {
    diffuseMap.colorSpace = THREE.SRGBColorSpace;
    diffuseMap.flipY = false;
  }, [diffuseMap]);

  return useCallback(
    (root: THREE.Object3D) => {
      root.traverse((node) => {
        if (!(node instanceof THREE.Mesh)) return;
        node.material = new THREE.MeshStandardMaterial({
          map: diffuseMap,
          roughness: 0.62,
          metalness: 0.06,
        });
      });
    },
    [diffuseMap],
  );
}

/**
 * Corazón humano 3D en la pared frontal del lobby (educativo, solo decoración).
 */
export default function LobbyDecorHeartWall({
  position = [0, 4, 9.55],
  rotation = [0, Math.PI, 0],
  scaleMultiplier = 0.95,
}: LobbyDecorHeartWallProps) {
  const prepareModel = useHeartWallMaterials();

  return (
    <WallSceneGlb
      url={HEART_URL}
      position={position}
      rotation={rotation}
      scaleMultiplier={scaleMultiplier}
      fitDepth
      prepareModel={prepareModel}
    />
  );
}
