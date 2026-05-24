import { useGLTF } from "@react-three/drei";
import { WallSceneGlb } from "@/components/lobby/lobbyWallGlbScene";

const FAROL_URL = "/assets/models/farol-lantern.glb";

useGLTF.preload(FAROL_URL);

type LobbyDecorFarolLanternProps = {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scaleMultiplier?: number;
};

/** Farol decorativo en la pared trasera del lobby. */
export default function LobbyDecorFarolLantern({
  position = [-5, 4.4, -9.55],
  rotation = [0, 0, 0],
  scaleMultiplier = 1.05,
}: LobbyDecorFarolLanternProps) {
  return (
    <WallSceneGlb
      url={FAROL_URL}
      position={position}
      rotation={rotation}
      scaleMultiplier={scaleMultiplier}
      fitDepth={false}
      spin={false}
    />
  );
}
