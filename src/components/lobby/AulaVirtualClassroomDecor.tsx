import { Text } from "@react-three/drei";
import LobbyDecorEarthMoon from "@/components/lobby/LobbyDecorEarthMoon";
import LobbyDecorHeartWall from "@/components/lobby/LobbyDecorHeartWall";
import LobbyDecorBrainWall from "@/components/lobby/LobbyDecorBrainWall";

const WOOD = "#8B6914";
const WOOD_DARK = "#5C4A1E";
const METAL = "#6B7280";
const CHAIR = "#4A5568";
const BOOK_COLORS = ["#B91C1C", "#1D4ED8", "#15803D", "#7C3AED", "#C2410C"];

type DeskRowProps = {
  z: number;
  deskCount?: number;
  spacing?: number;
};

function StudentDesk({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.36, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.05, 0.06, 0.62]} />
        <meshStandardMaterial color={WOOD} roughness={0.65} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.18, 0.22]} castShadow>
        <boxGeometry args={[0.92, 0.3, 0.04]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.7} metalness={0.05} />
      </mesh>
      {[
        [-0.38, -0.2],
        [0.38, -0.2],
        [-0.38, 0.2],
        [0.38, 0.2],
      ].map(([lx, lz], i) => (
        <mesh key={i} position={[lx, 0.17, lz]} castShadow>
          <boxGeometry args={[0.05, 0.34, 0.05]} />
          <meshStandardMaterial color={METAL} roughness={0.45} metalness={0.55} />
        </mesh>
      ))}
      <mesh position={[0, 0.42, -0.34]} castShadow>
        <boxGeometry args={[0.48, 0.04, 0.04]} />
        <meshStandardMaterial color={METAL} roughness={0.4} metalness={0.6} />
      </mesh>
      <mesh position={[0, 0.22, -0.48]} castShadow>
        <boxGeometry args={[0.42, 0.42, 0.04]} />
        <meshStandardMaterial color={CHAIR} roughness={0.75} metalness={0.05} />
      </mesh>
    </group>
  );
}

function DeskRow({ z, deskCount = 3, spacing = 2.2 }: DeskRowProps) {
  const startX = -((deskCount - 1) * spacing) / 2;
  return (
    <group>
      {Array.from({ length: deskCount }, (_, i) => (
        <StudentDesk key={i} x={startX + i * spacing} z={z} />
      ))}
    </group>
  );
}

function TeacherDesk({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.2, 0.08, 0.95]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.55} metalness={0.08} />
      </mesh>
      {[-0.95, 0.95].map((x) => (
        <mesh key={x} position={[x, 0.2, 0]} castShadow>
          <boxGeometry args={[0.08, 0.4, 0.75]} />
          <meshStandardMaterial color={WOOD} roughness={0.65} metalness={0.05} />
        </mesh>
      ))}
      <mesh position={[0.55, 0.52, -0.05]} castShadow>
        <boxGeometry args={[0.55, 0.38, 0.04]} />
        <meshStandardMaterial color="#1F2937" roughness={0.35} metalness={0.2} />
      </mesh>
      <mesh position={[0.55, 0.72, -0.05]} castShadow>
        <boxGeometry args={[0.58, 0.02, 0.06]} />
        <meshStandardMaterial color="#111827" roughness={0.2} metalness={0.4} />
      </mesh>
      <mesh position={[-0.35, 0.5, 0.15]} rotation={[-0.25, 0.35, 0]} castShadow>
        <boxGeometry args={[0.28, 0.02, 0.38]} />
        <meshStandardMaterial color="#F8FAFC" roughness={0.9} metalness={0} />
      </mesh>
    </group>
  );
}

function Chalkboard({ position, rotation }: { position: [number, number, number]; rotation: [number, number, number] }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0, -0.04]} castShadow>
        <boxGeometry args={[7.2, 3.2, 0.1]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.75} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[6.8, 2.85]} />
        <meshStandardMaterial color="#1B4332" roughness={0.92} metalness={0} />
      </mesh>
      <mesh position={[-2.4, 0.55, 0.01]}>
        <planeGeometry args={[1.6, 0.08]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.85} />
      </mesh>
      <mesh position={[1.8, -0.35, 0.01]}>
        <planeGeometry args={[2.2, 0.06]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.7} />
      </mesh>
      <Text
        position={[0, 1.55, 0.02]}
        fontSize={0.22}
        color="#F5F5F4"
        anchorX="center"
        anchorY="middle"
        maxWidth={6.4}
      >
        Aula Virtual OnniVers
      </Text>
      <mesh position={[-3.15, -1.35, 0.06]}>
        <boxGeometry args={[0.12, 0.04, 0.04]} />
        <meshStandardMaterial color="#F5F5DC" roughness={0.8} />
      </mesh>
      <mesh position={[-2.95, -1.35, 0.06]}>
        <boxGeometry args={[0.12, 0.04, 0.04]} />
        <meshStandardMaterial color="#2D6A4F" roughness={0.8} />
      </mesh>
    </group>
  );
}

function Bookshelf({ position, rotation }: { position: [number, number, number]; rotation: [number, number, number] }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 1.35, 0]} castShadow>
        <boxGeometry args={[1.6, 2.7, 0.42]} />
        <meshStandardMaterial color={WOOD} roughness={0.7} metalness={0.05} />
      </mesh>
      {[0.55, 1.35, 2.15].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <boxGeometry args={[1.48, 0.05, 0.38]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.75} />
        </mesh>
      ))}
      {BOOK_COLORS.flatMap((color, shelf) =>
        [-0.45, 0, 0.45].map((x, i) => (
          <mesh key={`${shelf}-${i}`} position={[x, 0.55 + shelf * 0.8, 0.06]} castShadow>
            <boxGeometry args={[0.22, 0.55 + (i % 2) * 0.08, 0.12]} />
            <meshStandardMaterial color={color} roughness={0.85} />
          </mesh>
        )),
      )}
    </group>
  );
}

function CeilingLights({ roomSize, wallHeight }: { roomSize: number; wallHeight: number }) {
  const positions: [number, number, number][] = [
    [-4, wallHeight - 0.15, -3],
    [4, wallHeight - 0.15, -3],
    [-4, wallHeight - 0.15, 3],
    [4, wallHeight - 0.15, 3],
  ];

  return (
    <>
      {positions.map((pos, i) => (
        <group key={i} position={pos}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[roomSize * 0.22, 0.55]} />
            <meshStandardMaterial
              color="#FFFDF5"
              emissive="#FFF4D6"
              emissiveIntensity={0.35}
              roughness={0.4}
            />
          </mesh>
          <pointLight color="#FFF8EE" intensity={18} distance={roomSize * 0.55} decay={2} />
        </group>
      ))}
    </>
  );
}

type AulaVirtualClassroomDecorProps = {
  roomSize: number;
  wallHeight: number;
};

export default function AulaVirtualClassroomDecor({ roomSize, wallHeight }: AulaVirtualClassroomDecorProps) {
  const half = roomSize / 2;

  return (
    <>
      <CeilingLights roomSize={roomSize} wallHeight={wallHeight} />
      <Chalkboard position={[0, wallHeight * 0.52, half - 0.12]} rotation={[0, Math.PI, 0]} />
      <LobbyDecorEarthMoon position={[-6.25, wallHeight * 0.52, half - 0.42]} scale={1.76} />
      <LobbyDecorHeartWall
        position={[5.15, wallHeight * 0.52, half - 0.42]}
        rotation={[0, Math.PI, 0]}
        scaleMultiplier={0.63}
      />
      <LobbyDecorBrainWall
        position={[7.05, wallHeight * 0.52, half - 0.42]}
        rotation={[0, Math.PI, 0]}
        scaleMultiplier={0.68}
      />
      <TeacherDesk position={[0, 0, half - 2.35]} />
      <DeskRow z={1.2} deskCount={3} />
      <DeskRow z={-0.8} deskCount={3} />
      <DeskRow z={-2.8} deskCount={3} />
      <Bookshelf position={[-half + 0.85, 0, -1.5]} rotation={[0, Math.PI / 2, 0]} />
      <mesh position={[-half + 0.08, wallHeight * 0.72, 2.2]} rotation={[0, Math.PI / 2, 0]}>
        <circleGeometry args={[0.35, 32]} />
        <meshStandardMaterial color="#F8FAFC" roughness={0.35} metalness={0.15} />
      </mesh>
      <mesh position={[-half + 0.07, wallHeight * 0.72, 2.2]} rotation={[0, Math.PI / 2, 0]}>
        <ringGeometry args={[0.28, 0.33, 32]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.6} />
      </mesh>
    </>
  );
}
