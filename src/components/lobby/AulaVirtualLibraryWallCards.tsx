import { Suspense, useEffect, useMemo } from "react";
import { Text } from "@react-three/drei";
import { useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { BIBLIOTECA_WALL_BOOKS, type BibliotecaWallBook } from "@/lib/bibliotecaProducts";

const CARD_SCALE = 3;
const CARD_W = 0.52 * CARD_SCALE;
const CARD_H = 0.68 * CARD_SCALE;
const CARD_D = 0.06 * CARD_SCALE;
const CARD_FRONT_Z = CARD_D * 0.52;

BIBLIOTECA_WALL_BOOKS.forEach((book) => {
  useLoader.preload(THREE.TextureLoader, book.image);
});

type LibraryWallCardProps = {
  book: BibliotecaWallBook;
  position: [number, number, number];
  rotation: [number, number, number];
};

function LibraryWallCardCover({ book }: { book: BibliotecaWallBook }) {
  const cover = useLoader(THREE.TextureLoader, book.image);

  useEffect(() => {
    cover.colorSpace = THREE.SRGBColorSpace;
    cover.minFilter = THREE.LinearFilter;
    cover.magFilter = THREE.LinearFilter;
    cover.needsUpdate = true;
  }, [cover]);

  return (
    <mesh position={[0, 0.05 * CARD_SCALE, CARD_FRONT_Z + 0.002]} renderOrder={3}>
      <planeGeometry args={[CARD_W, CARD_H * 0.7]} />
      <meshBasicMaterial map={cover} toneMapped={false} />
    </mesh>
  );
}

function LibraryWallCard({ book, position, rotation }: LibraryWallCardProps) {
  const coverColor = useMemo(() => new THREE.Color(book.accent).multiplyScalar(0.72), [book.accent]);

  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[CARD_W + 0.06 * CARD_SCALE, CARD_H + 0.06 * CARD_SCALE, CARD_D]} />
        <meshStandardMaterial color="#1E293B" roughness={0.55} metalness={0.1} />
      </mesh>

      <mesh position={[0, 0.05 * CARD_SCALE, CARD_FRONT_Z]} renderOrder={2}>
        <planeGeometry args={[CARD_W, CARD_H * 0.7]} />
        <meshStandardMaterial color={coverColor} roughness={0.78} metalness={0.05} />
      </mesh>

      <Suspense fallback={null}>
        <LibraryWallCardCover book={book} />
      </Suspense>

      <mesh position={[-CARD_W * 0.28, CARD_H * 0.36, CARD_FRONT_Z + 0.003]} renderOrder={4}>
        <planeGeometry args={[CARD_W * 0.34, 0.08 * CARD_SCALE]} />
        <meshStandardMaterial color={book.accent} roughness={0.4} metalness={0.08} />
      </mesh>

      <Text
        position={[-CARD_W * 0.28, CARD_H * 0.36, CARD_FRONT_Z + 0.005]}
        fontSize={0.034 * CARD_SCALE}
        color="#FFFFFF"
        anchorX="center"
        anchorY="middle"
        renderOrder={5}
      >
        Libro
      </Text>

      <mesh position={[0, -CARD_H * 0.34, CARD_FRONT_Z + 0.001]} renderOrder={2}>
        <planeGeometry args={[CARD_W * 0.92, CARD_H * 0.2]} />
        <meshStandardMaterial color="#F8FAFC" roughness={0.9} metalness={0} />
      </mesh>

      <Text
        position={[0, -CARD_H * 0.34, CARD_FRONT_Z + 0.003]}
        fontSize={0.036 * CARD_SCALE}
        color="#334155"
        anchorX="center"
        anchorY="middle"
        maxWidth={CARD_W * 0.86}
        textAlign="center"
        renderOrder={5}
      >
        {book.title}
      </Text>
    </group>
  );
}

type AulaVirtualLibraryWallCardsProps = {
  roomSize: number;
};

/**
 * Tarjetas de Biblioteca en la pared izquierda con portadas de la Tienda.
 */
export default function AulaVirtualLibraryWallCards({ roomSize }: AulaVirtualLibraryWallCardsProps) {
  const half = roomSize / 2;
  const wallX = -half + 0.42;
  const wallRotation: [number, number, number] = [0, Math.PI / 2, 0];

  const columns = [-2.25, -4.15, -6.05];
  const rows = [4.85, 1.95];

  const placements: [number, number, number][] = rows.flatMap((y) =>
    columns.map((z) => [wallX, y, z] as [number, number, number]),
  );

  return (
    <group>
      {BIBLIOTECA_WALL_BOOKS.map((book, i) => (
        <LibraryWallCard key={book.id} book={book} position={placements[i]} rotation={wallRotation} />
      ))}
    </group>
  );
}
