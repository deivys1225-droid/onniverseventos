type LobbyDecorArchitectWallProps = {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scaleMultiplier?: number;
};

/**
 * Columna clásica en la pared izquierda (geometría 3D local, siempre visible).
 */
export default function LobbyDecorArchitectWall({
  position = [-9.3, 4, 0],
  rotation = [0, Math.PI / 2, 0],
  scaleMultiplier = 1.35,
}: LobbyDecorArchitectWallProps) {
  const shaftColor = "#d4c4a8";
  const capColor = "#b8a88c";

  return (
    <group position={position} rotation={rotation} scale={scaleMultiplier} raycast={() => null}>
      <mesh position={[0, -1.35, 0]}>
        <boxGeometry args={[2.4, 0.22, 2.4]} />
        <meshStandardMaterial color={capColor} metalness={0.15} roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.42, 0.5, 2.7, 24]} />
        <meshStandardMaterial color={shaftColor} metalness={0.12} roughness={0.68} />
      </mesh>
      <mesh position={[0, 1.55, 0]}>
        <cylinderGeometry args={[0.62, 0.62, 0.28, 24]} />
        <meshStandardMaterial color={capColor} metalness={0.18} roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.85, 0]}>
        <boxGeometry args={[1.35, 0.32, 1.35]} />
        <meshStandardMaterial color={capColor} metalness={0.18} roughness={0.7} />
      </mesh>
    </group>
  );
}
