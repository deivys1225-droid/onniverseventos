import { useCallback } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { WallSceneGlb } from "@/components/lobby/lobbyWallGlbScene";

export const DINO_TREX_URL = "/assets/models/dino-trex.glb";
export const DINO_DIPLO_URL = "/assets/models/dino-diplo.glb";
export const DINO_GENERIC_URL = "/assets/models/dino-generic.glb";

useGLTF.preload(DINO_TREX_URL);
useGLTF.preload(DINO_DIPLO_URL);
useGLTF.preload(DINO_GENERIC_URL);

const DINO_SPIN_SPEED = 0.24;

/** Paletas naturales (reptil/mamífero), no colores de juguete. */
export const DINO_TREX_COLORS = ["#5C4A38", "#6E6250", "#4A5340"];
export const DINO_GENERIC_COLORS = ["#3A3632", "#7A96A8", "#4A6578"];
export const DINO_DIPLO_COLORS = ["#7A7568", "#6B7365", "#8C8578"];

type LobbyDecorDinosaurWallProps = {
  url: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scaleMultiplier?: number;
  /** Tonos por malla; por defecto marrones/grises naturales. */
  colors?: string[];
  spin?: boolean;
  spinSpeed?: number;
};

/**
 * Dinosaurio 3D decorativo en pared del aula (paleontología / ciencias naturales).
 */
export default function LobbyDecorDinosaurWall({
  url,
  position = [-8.2, 3.2, 9.58],
  rotation = [0, Math.PI, 0],
  scaleMultiplier = 0.42,
  colors = ["#5C4A38", "#6E6250"],
  spin = true,
  spinSpeed = DINO_SPIN_SPEED,
}: LobbyDecorDinosaurWallProps) {
  const prepareModel = useCallback(
    (root: THREE.Object3D) => {
      let meshIndex = 0;
      root.traverse((node) => {
        if (!(node instanceof THREE.Mesh)) return;
        const hex = colors[meshIndex % colors.length];
        meshIndex += 1;
        node.material = new THREE.MeshStandardMaterial({
          color: hex,
          roughness: 0.78,
          metalness: 0.03,
        });
      });
    },
    [colors],
  );

  return (
    <WallSceneGlb
      url={url}
      position={position}
      rotation={rotation}
      scaleMultiplier={scaleMultiplier}
      fitDepth={false}
      spin={spin}
      spinSpeed={spinSpeed}
      prepareModel={prepareModel}
    />
  );
}
