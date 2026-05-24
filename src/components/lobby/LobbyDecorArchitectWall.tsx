import { WallSceneGlb } from "@/components/lobby/lobbyWallGlbScene";
import { useGLTF } from "@react-three/drei";

/** CC0 — Khronos glTF Sample Assets (Lantern). https://github.com/KhronosGroup/glTF-Sample-Assets */
const LANTERN_URL = "/assets/models/farol-lantern.glb";

useGLTF.preload(LANTERN_URL);

type LobbyDecorArchitectWallProps = {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scaleMultiplier?: number;
};

/**
 * Farol arquitectónico (código abierto) en la pared izquierda del lobby.
 */
export default function LobbyDecorArchitectWall({
  position = [-9.55, 4, 0],
  rotation = [0, Math.PI / 2, 0],
  scaleMultiplier = 1.05,
}: LobbyDecorArchitectWallProps) {
  return (
    <WallSceneGlb url={LANTERN_URL} position={position} rotation={rotation} scaleMultiplier={scaleMultiplier} />
  );
}
