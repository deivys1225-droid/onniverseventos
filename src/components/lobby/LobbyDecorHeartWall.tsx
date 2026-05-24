import { GALERIA_3D_MODELS } from "@/lib/galeria3dModels";
import { WallSceneGlb } from "@/components/lobby/lobbyWallGlbScene";
import { useGLTF } from "@react-three/drei";

const HEART_URL =
  GALERIA_3D_MODELS.find((model) => model.id === "corazon")?.modelUrl ?? "/assets/models/corazon.glb";

useGLTF.preload(HEART_URL);

type LobbyDecorHeartWallProps = {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scaleMultiplier?: number;
};

/**
 * Corazón humano 3D en la pared frontal del lobby (educativo, solo decoración).
 */
export default function LobbyDecorHeartWall({
  position = [0, 4, 9.55],
  rotation = [0, Math.PI, 0],
  scaleMultiplier = 0.95,
}: LobbyDecorHeartWallProps) {
  return (
    <WallSceneGlb url={HEART_URL} position={position} rotation={rotation} scaleMultiplier={scaleMultiplier} />
  );
}
