import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  MAX_WEBGL_PIXEL_RATIO,
  applyPixelRatioCap,
  isMobileCoarseDevice,
} from "@/lib/webglRendererPrefs";

/** Blanco perlado de la sala */
const PEARL_BG = "#f2f0ec";

const SCREEN_W = 4.8;
const SCREEN_H = 2.7;

const SCREENS: { position: [number, number, number]; label: string }[] = [
  { position: [-5.4, 2.9, -5.5], label: "Pantalla 1" },
  { position: [0, 3.15, -6.2], label: "Pantalla 2" },
  { position: [5.4, 2.9, -5.5], label: "Pantalla 3" },
];

type FloatingScreenProps = {
  position: [number, number, number];
  label: string;
  index: number;
};

function FloatingScreen({ position, index }: FloatingScreenProps) {
  const groupRef = useRef<THREE.Group>(null);
  const phase = useMemo(() => index * 1.35, [index]);
  const baseY = position[1];

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.position.set(position[0], baseY + Math.sin(t * 0.85 + phase) * 0.1, position[2]);
  });

  return (
    <group ref={groupRef} position={position} rotation={[0, Math.PI, 0]}>
      {/* Sombra suave detrás */}
      <mesh position={[0, 0, -0.08]}>
        <planeGeometry args={[SCREEN_W + 0.5, SCREEN_H + 0.5]} />
        <meshBasicMaterial color="#c8c4bc" transparent opacity={0.45} toneMapped={false} />
      </mesh>
      {/* Marco */}
      <mesh position={[0, 0, -0.04]}>
        <planeGeometry args={[SCREEN_W + 0.32, SCREEN_H + 0.32]} />
        <meshBasicMaterial color="#1e293b" toneMapped={false} />
      </mesh>
      {/* Pantalla (placeholder) */}
      <mesh>
        <planeGeometry args={[SCREEN_W, SCREEN_H]} />
        <meshBasicMaterial color="#334155" toneMapped={false} />
      </mesh>
      {/* Reflejo perlado en el borde */}
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[SCREEN_W - 0.15, SCREEN_H - 0.15]} />
        <meshBasicMaterial color="#475569" transparent opacity={0.92} toneMapped={false} />
      </mesh>
    </group>
  );
}

function CinemaRoom() {
  return (
    <>
      <color attach="background" args={[PEARL_BG]} />
      <fog attach="fog" args={[PEARL_BG, 28, 70]} />

      <ambientLight intensity={1.05} color="#fffef8" />
      <hemisphereLight args={["#ffffff", "#e8e4dc"]} intensity={0.85} />
      <directionalLight position={[2, 10, 8]} intensity={0.65} color="#fffaf0" />
      <directionalLight position={[-4, 6, 4]} intensity={0.35} color="#e0f2fe" />

      {/* Suelo perlado */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -1]}>
        <planeGeometry args={[40, 28]} />
        <meshStandardMaterial color="#ebe8e2" roughness={0.88} metalness={0.04} />
      </mesh>

      {/* Pared trasera */}
      <mesh position={[0, 4.5, -12]}>
        <planeGeometry args={[40, 10]} />
        <meshStandardMaterial color="#e6e2db" roughness={0.95} />
      </mesh>

      {SCREENS.map((screen, index) => (
        <FloatingScreen
          key={screen.label}
          position={screen.position}
          label={screen.label}
          index={index}
        />
      ))}

      <OrbitControls
        makeDefault
        target={[0, 2.6, -5.5]}
        enablePan={false}
        enableDamping
        dampingFactor={0.06}
        rotateSpeed={0.5}
        minDistance={4}
        maxDistance={14}
        minPolarAngle={0.25}
        maxPolarAngle={Math.PI / 2 - 0.05}
        minAzimuthAngle={-0.9}
        maxAzimuthAngle={0.9}
      />
    </>
  );
}

export default function TripleCinemaScene() {
  const isMobile = isMobileCoarseDevice();

  return (
    <Canvas
      className="absolute inset-0 h-full w-full touch-none"
      dpr={[1, isMobile ? 1.5 : MAX_WEBGL_PIXEL_RATIO]}
      camera={{ position: [0, 2.4, 9.2], fov: isMobile ? 60 : 55, near: 0.1, far: 100 }}
      gl={{ antialias: !isMobile, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        applyPixelRatioCap(gl);
        gl.setClearColor(PEARL_BG, 1);
      }}
    >
      <Suspense fallback={null}>
        <CinemaRoom />
      </Suspense>
    </Canvas>
  );
}
