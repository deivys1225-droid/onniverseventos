import { useCallback } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { WallSceneGlb } from "@/components/lobby/lobbyWallGlbScene";

const BRAIN_URL = "/assets/models/cerebro.glb";

const BRAIN_TISSUE_COLORS = ["#C98888", "#B87575", "#D4A0A0", "#A86868"];

useGLTF.preload(BRAIN_URL);

type LobbyDecorBrainWallProps = {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scaleMultiplier?: number;
};

/**
 * Cerebro humano 3D en pared del aula (materiales realistas sobre malla anatómica).
 */
export default function LobbyDecorBrainWall({
  position = [7.05, 4, 9.55],
  rotation = [0, Math.PI, 0],
  scaleMultiplier = 0.68,
}: LobbyDecorBrainWallProps) {
  const prepareModel = useCallback((root: THREE.Object3D) => {
    let meshIndex = 0;
    root.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      const base = BRAIN_TISSUE_COLORS[meshIndex % BRAIN_TISSUE_COLORS.length];
      meshIndex += 1;
      node.material = new THREE.MeshStandardMaterial({
        color: base,
        roughness: 0.78,
        metalness: 0.04,
        emissive: "#3d1818",
        emissiveIntensity: 0.06,
      });
    });
  }, []);

  return (
    <WallSceneGlb
      url={BRAIN_URL}
      position={position}
      rotation={rotation}
      scaleMultiplier={scaleMultiplier}
      fitDepth
      prepareModel={prepareModel}
    />
  );
}
