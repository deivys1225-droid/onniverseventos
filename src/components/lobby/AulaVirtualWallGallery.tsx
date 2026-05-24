import { Text } from "@react-three/drei";

const LETTER_COLORS = [
  "#E63946",
  "#F4A261",
  "#E9C46A",
  "#2A9D8F",
  "#457B9D",
  "#7209B7",
  "#F72585",
  "#4CC9F0",
  "#80B918",
  "#FF6B6B",
  "#06D6A0",
  "#118AB2",
  "#8338EC",
];

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const ALPHABET_ROW_1 = ALPHABET.slice(0, 13);
const ALPHABET_ROW_2 = ALPHABET.slice(13);

const NUMBER_COLORS = [
  "#FF595E",
  "#FF924C",
  "#FFCA3A",
  "#8AC926",
  "#1982C4",
  "#6A4C93",
  "#F15BB5",
  "#00BBF9",
  "#00F5D4",
  "#FEE440",
];

function BlockGlyph({
  glyph,
  color,
  position,
  size = 0.44,
}: {
  glyph: string;
  color: string;
  position: [number, number, number];
  size?: number;
}) {
  const half = size / 2;
  const depth = size * 0.92;

  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[size, size, depth]} />
        <meshStandardMaterial color={color} roughness={0.48} metalness={0.08} />
      </mesh>
      <mesh position={[0, 0, half + 0.01]}>
        <boxGeometry args={[size * 0.88, size * 0.88, 0.04]} />
        <meshStandardMaterial
          color={color}
          roughness={0.35}
          metalness={0.12}
          emissive={color}
          emissiveIntensity={0.08}
        />
      </mesh>
      <Text
        position={[0, 0, half + 0.04]}
        fontSize={size * 0.62}
        color="#FFFFFF"
        anchorX="center"
        anchorY="middle"
        outlineWidth={size * 0.04}
        outlineColor="#1F2937"
      >
        {glyph}
      </Text>
    </group>
  );
}

function WallGlyphRow({
  glyphs,
  colors,
  y,
  spacing,
  size,
}: {
  glyphs: string[];
  colors: string[];
  y: number;
  spacing: number;
  size: number;
}) {
  const startX = -((glyphs.length - 1) * spacing) / 2;

  return (
    <>
      {glyphs.map((glyph, i) => (
        <BlockGlyph
          key={`${glyph}-${i}`}
          glyph={glyph}
          color={colors[i % colors.length]}
          position={[startX + i * spacing, y, 0.38]}
          size={size}
        />
      ))}
    </>
  );
}

type AulaVirtualWallGalleryProps = {
  roomSize: number;
  wallHeight: number;
};

/**
 * Pared derecha: abecedario y números en cubos 3D.
 */
export default function AulaVirtualWallGallery({ roomSize, wallHeight }: AulaVirtualWallGalleryProps) {
  const half = roomSize / 2;
  const wallX = half - 0.38;

  const letterSize = 0.9;
  const letterSpacing = 1.02;
  const numberSize = 0.84;
  const numberSpacing = 0.92;

  return (
    <group position={[wallX, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
      <Text
        position={[0, 5.35, 0.32]}
        rotation={[0, Math.PI / 2, 0]}
        fontSize={0.52}
        color="#2D6A4F"
        anchorX="center"
        anchorY="middle"
      >
        Aprendizaje 3D
      </Text>

      <WallGlyphRow
        glyphs={ALPHABET_ROW_1}
        colors={LETTER_COLORS}
        y={4.75}
        spacing={letterSpacing}
        size={letterSize}
      />
      <WallGlyphRow
        glyphs={ALPHABET_ROW_2}
        colors={LETTER_COLORS}
        y={3.45}
        spacing={letterSpacing}
        size={letterSize}
      />
      <WallGlyphRow
        glyphs={"0123456789".split("")}
        colors={NUMBER_COLORS}
        y={2.1}
        spacing={numberSpacing}
        size={numberSize}
      />

    </group>
  );
}
