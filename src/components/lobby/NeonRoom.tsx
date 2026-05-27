import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Capacitor } from "@capacitor/core";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera } from "lucide-react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, PointerLockControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import {
  applyPixelRatioCap,
  isMobileCoarseDevice,
  MAX_WEBGL_PIXEL_RATIO,
} from "@/lib/webglRendererPrefs";
import { useLobbyFinePointer } from "@/lib/useLobbyFinePointer";
import LobbyMouseButtonControls, {
  createMouseMoveInput,
  LobbyMobileMouseLook,
  LobbyMobileWheelOrbitSpin,
} from "@/components/lobby/LobbyMouseControls";
import MobileLobbyMovePad, {
  createMobileMoveInput,
  type MobileMoveInput,
} from "@/components/lobby/MobileLobbyMovePad";
import LobbyDeviceOrientationLook from "@/components/lobby/LobbyDeviceOrientationLook";
import LobbyDecorEarthMoon from "@/components/lobby/LobbyDecorEarthMoon";
import LobbyDecorHeartWall from "@/components/lobby/LobbyDecorHeartWall";
import LobbyDecorFarolLantern from "@/components/lobby/LobbyDecorFarolLantern";
import LobbyGyroToggleButton from "@/components/lobby/LobbyGyroToggleButton";
import { requestDeviceOrientationPermission } from "@/lib/deviceOrientationCamera";
import { LobbyScreenOneHub } from "@/components/lobby/LobbyScreenOneHub";
import { LobbyScreenThreeSalasPlayer } from "@/components/lobby/LobbyScreenThreeSalasPlayer";
import { LobbyScreenFourWebViewSlot } from "@/components/lobby/LobbyScreenFourWebViewSlot";
import AulaVirtualClassroomDecor from "@/components/lobby/AulaVirtualClassroomDecor";
import AulaVirtualWallGallery from "@/components/lobby/AulaVirtualWallGallery";
import { ROOM_THEMES, type ImmersiveRoomVariant } from "@/components/lobby/aulaVirtualTheme";
import { onOpCommand } from "@/lib/opCommandBus";

export type { ImmersiveRoomVariant };

export type NeonRoomProps = {
  variant?: ImmersiveRoomVariant;
};

const ROOM_SIZE = 20;
const WALL_HEIGHT = 8;
const PLAYER_HEIGHT = 3.045;
const PLAYER_RADIUS = 0.4;
const MOVE_SPEED = 4.5;
const WORLD_UP = new THREE.Vector3(0, 1, 0);

const WALL_COLOR = "#EAECEE";
const LOBBY_SCREEN_HTML_Z_INDEX: [number, number] = [10000, 0];

/**
 * Google Maps embebido (`output=embed`) — suele verse bien en iframe en web y en el WebView de Capacitor.
 * Pantallas 2 y 3 del lobby usan la misma URL por defecto.
 */
const LOBBY_GOOGLE_MAPS_EMBED =
  "https://www.google.com/maps?q=Bogot%C3%A1,+Colombia&hl=es&z=12&output=embed";

const WALL_SCREEN_EMBEDS = [
  "about:blank",
  LOBBY_GOOGLE_MAPS_EMBED,
  "about:blank",
  "about:blank",
] as const;

type LobbyScreenUrls = [string, string, string, string];

const LOBBY_SCREEN_URLS_STORAGE_KEY = "onniverso.lobby.screen_urls";

function defaultLobbyScreenUrls(): LobbyScreenUrls {
  return [...WALL_SCREEN_EMBEDS];
}

function isGoogleMapsEmbed(url: string): boolean {
  const u = url.trim().toLowerCase();
  return u.includes("google.com/maps") || u.includes("maps.google.");
}

/** Vídeos viejos (YouTube, Cloudinary, etc.) que no deben ir en pantallas 2 y 3. */
function isLegacyLobbyVideoEmbed(url: string): boolean {
  const u = url.trim().toLowerCase();
  if (!u || u === "about:blank") return false;
  if (isGoogleMapsEmbed(url)) return false;
  return (
    u.includes("youtube.com") ||
    u.includes("youtu.be") ||
    u.includes("tiktok.com") ||
    u.includes("cloudinary.com") ||
    /\.(mp4|webm|m3u8)(\?|#|$)/i.test(u)
  );
}

function migrateLobbyScreenUrls(urls: LobbyScreenUrls): LobbyScreenUrls {
  const next = [...urls] as LobbyScreenUrls;

  if (next[0] === "https://onnivers.com" || next[0] === "https://www.google.com") {
    next[0] = "about:blank";
  }
  if (next[3] === "https://www.youtube.com/embed/RgKAFK5djSk") {
    next[3] = "about:blank";
  }
  if (isGlbSource(next[3])) {
    next[3] = "about:blank";
  }

  if (next[1] === "about:blank" || isLegacyLobbyVideoEmbed(next[1])) {
    next[1] = LOBBY_GOOGLE_MAPS_EMBED;
  }

  // Pantalla 3: reproductor de salas (no iframe de mapa ni vídeo suelto)
  if (next[2] === "about:blank" || isLegacyLobbyVideoEmbed(next[2]) || isGoogleMapsEmbed(next[2])) {
    next[2] = "about:blank";
  }

  return next;
}

function persistLobbyScreenUrls(urls: LobbyScreenUrls) {
  try {
    localStorage.setItem(LOBBY_SCREEN_URLS_STORAGE_KEY, JSON.stringify(urls));
  } catch {
    /* quota / modo privado */
  }
}

function readStoredLobbyScreenUrls(): LobbyScreenUrls | null {
  try {
    const raw = localStorage.getItem(LOBBY_SCREEN_URLS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length !== 4 || !parsed.every((value) => typeof value === "string")) {
      return null;
    }
    const stored = [...parsed] as LobbyScreenUrls;
    const urls = migrateLobbyScreenUrls(stored);
    if (JSON.stringify(urls) !== JSON.stringify(stored)) {
      persistLobbyScreenUrls(urls);
    }
    return urls;
  } catch {
    return null;
  }
}

function isGlbSource(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;

  try {
    const parsed = new URL(trimmed, window.location.origin);
    const path = decodeURIComponent(parsed.pathname).toLowerCase();
    if (path.endsWith(".glb") || path.endsWith(".gltf")) return true;
    return /\.glb(?:$|[?#])/i.test(parsed.href) || /\.gltf(?:$|[?#])/i.test(parsed.href);
  } catch {
    const normalized = trimmed.toLowerCase().split("?")[0]?.split("#")[0] ?? "";
    return normalized.endsWith(".glb") || normalized.endsWith(".gltf");
  }
}

const WALL_SCREEN_WIDTH = 8;
const WALL_SCREEN_HEIGHT = 4.5;
/** Pantallas 2 y 4: mitad del tamaño de pared completa. */
const LOBBY_PANEL_HALF_WIDTH = (ROOM_SIZE - 0.9) / 2;
const LOBBY_PANEL_HALF_HEIGHT = (WALL_HEIGHT - 0.9) / 2;
const SIDE_WALL_SCREEN4_WIDTH = LOBBY_PANEL_HALF_WIDTH;
const SIDE_WALL_SCREEN4_HEIGHT = LOBBY_PANEL_HALF_HEIGHT;

/** Panel central en la pared del fondo (solo pantalla 2 / salas). */
const WALL1_SALAS_WIDTH = LOBBY_PANEL_HALF_WIDTH;
const WALL1_PANEL_HEIGHT = LOBBY_PANEL_HALF_HEIGHT;
const LOBBY_WEB_EMBED_URL = "https://onnivers.com/nuestras-salas";
const SIDE_WALL_SCREEN3_WIDTH = ROOM_SIZE - 0.9;
const SIDE_WALL_SCREEN3_HEIGHT = WALL_HEIGHT - 0.9;

type HoloScreenKind = "hub" | "salas" | "webpage" | "screen4";

const MIXED_REALITY_CAMERA_ERROR =
  "No se pudo acceder a la camara trasera. Revisa los permisos del navegador y vuelve a intentarlo.";

function stopCameraStream(video: HTMLVideoElement | null) {
  const stream = video?.srcObject;
  if (stream instanceof MediaStream) {
    stream.getTracks().forEach((track) => track.stop());
  }
  if (video) {
    video.srcObject = null;
  }
}

function getLobbyCameraVideoConstraints(): MediaTrackConstraints {
  if (typeof window === "undefined") {
    return { facingMode: { ideal: "environment" } };
  }

  const cap = Math.min(window.devicePixelRatio || 1, MAX_WEBGL_PIXEL_RATIO);
  const idealWidth = Math.min(Math.round(window.innerWidth * cap), 1920);
  const idealHeight = Math.min(Math.round(window.innerHeight * cap), 1080);

  return {
    facingMode: { ideal: "environment" },
    width: { ideal: idealWidth, max: 1920 },
    height: { ideal: idealHeight, max: 1080 },
  };
}

async function applyCameraTrackConstraints(video: HTMLVideoElement | null) {
  const stream = video?.srcObject;
  if (!(stream instanceof MediaStream)) return;

  const track = stream.getVideoTracks()[0];
  if (!track) return;

  try {
    await track.applyConstraints(getLobbyCameraVideoConstraints());
  } catch {
    /* ignore */
  }
}

// ---------- Pearly white wall ----------
function Wall({
  position,
  rotation,
  width,
  height,
  visible,
  color = WALL_COLOR,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  width: number;
  height: number;
  visible: boolean;
  color?: string;
}) {
  return (
    <mesh position={position} rotation={rotation} receiveShadow visible={visible}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial
        color={color}
        roughness={0.2}
        metalness={0.1}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ---------- Ceiling ----------
function Ceiling({ visible, color = "#F0F0F0" }: { visible: boolean; color?: string }) {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, WALL_HEIGHT, 0]} receiveShadow visible={visible}>
      <planeGeometry args={[ROOM_SIZE, ROOM_SIZE]} />
      <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
    </mesh>
  );
}

// ---------- Floor ----------
function Floor({
  visible,
  floorColor = "#1a1d24",
  gridColor = "#00ffff",
}: {
  visible: boolean;
  floorColor?: string;
  gridColor?: string | null;
}) {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow visible={visible}>
        <planeGeometry args={[ROOM_SIZE, ROOM_SIZE]} />
        <meshStandardMaterial color={floorColor} roughness={0.4} metalness={0.3} />
      </mesh>
      {gridColor && (
        <gridHelper
          args={[ROOM_SIZE, ROOM_SIZE, gridColor, gridColor]}
          position={[0, 0.01, 0]}
          visible={visible}
        />
      )}
    </>
  );
}

// ---------- Room with 4 walls ----------
function Room({
  structureVisible,
  theme,
}: {
  structureVisible: boolean;
  theme: (typeof ROOM_THEMES)[ImmersiveRoomVariant];
}) {
  const half = ROOM_SIZE / 2;
  const midY = WALL_HEIGHT / 2;
  return (
    <>
      <Floor
        visible={structureVisible}
        floorColor={theme.floorColor}
        gridColor={theme.floorGridColor}
      />
      <Ceiling visible={structureVisible} color={theme.ceilingColor} />
      <Wall position={[0, midY, -half]} rotation={[0, 0, 0]} width={ROOM_SIZE} height={WALL_HEIGHT} visible={structureVisible} color={theme.wallColor} />
      <Wall position={[0, midY, half]} rotation={[0, Math.PI, 0]} width={ROOM_SIZE} height={WALL_HEIGHT} visible={structureVisible} color={theme.wallColor} />
      <Wall position={[-half, midY, 0]} rotation={[0, Math.PI / 2, 0]} width={ROOM_SIZE} height={WALL_HEIGHT} visible={structureVisible} color={theme.wallColor} />
      <Wall position={[half, midY, 0]} rotation={[0, -Math.PI / 2, 0]} width={ROOM_SIZE} height={WALL_HEIGHT} visible={structureVisible} color={theme.wallColor} />
    </>
  );
}

// ---------- Holographic neon screen (reusable on any wall) ----------
function HoloScreen({
  position,
  rotation,
  kind,
  embedUrl,
  label,
  focused,
  interactionMode,
  onFocus,
  width = WALL_SCREEN_WIDTH,
  height = WALL_SCREEN_HEIGHT,
  frameColor = "#00ffff",
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  kind: HoloScreenKind;
  embedUrl?: string;
  label: number;
  focused: boolean;
  interactionMode: boolean;
  onFocus: () => void;
  width?: number;
  height?: number;
  frameColor?: string;
}) {
  const w = width;
  const h = height;
  const embedWidth =
    kind === "webpage"
      ? Math.round(560 * (w / WALL_SCREEN_WIDTH))
      : Math.round(800 * (w / WALL_SCREEN_WIDTH));
  const embedHeight = Math.round((embedWidth * h) / w);
  const htmlScale = (w / embedWidth) * 36.225;
  const htmlZIndexRange = LOBBY_SCREEN_HTML_Z_INDEX;
  const screenPointerEvents = !interactionMode || focused ? "auto" : "none";

  return (
    <group position={position} rotation={rotation}>
      <Html
        transform
        position={[0, 0, 0.05]}
        scale={htmlScale}
        zIndexRange={htmlZIndexRange}
        style={{ pointerEvents: screenPointerEvents }}
      >
        <div
          onPointerDownCapture={(event) => {
            event.stopPropagation();
            onFocus();
          }}
          style={{
            width: `${embedWidth}px`,
            background: "#02030a",
            pointerEvents: screenPointerEvents,
          }}
        >
          {kind === "hub" ? (
            <LobbyScreenOneHub width={embedWidth} height={embedHeight} />
          ) : kind === "salas" ? (
            <LobbyScreenThreeSalasPlayer width={embedWidth} height={embedHeight} />
          ) : kind === "screen4" ? (
            <LobbyScreenFourWebViewSlot width={embedWidth} height={embedHeight} />
          ) : (
            <iframe
              key={embedUrl}
              src={embedUrl ?? LOBBY_WEB_EMBED_URL}
              width={embedWidth}
              height={embedHeight}
              title="onnivers.com — Nuestras salas"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              style={{
                border: "0",
                display: "block",
                width: `${embedWidth}px`,
                height: `${embedHeight}px`,
                background: "#02030a",
                pointerEvents: screenPointerEvents,
              }}
            />
          )}
        </div>
      </Html>
      {/* Dark holographic panel so stars/content read on light walls */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial color="#02030a" toneMapped={false} />
      </mesh>
      {/* Border lines using thin emissive planes */}
      {[
        { p: [0, h / 2, 0.01] as [number, number, number], s: [w, 0.04] as [number, number] },
        { p: [0, -h / 2, 0.01] as [number, number, number], s: [w, 0.04] as [number, number] },
        { p: [-w / 2, 0, 0.01] as [number, number, number], s: [0.04, h] as [number, number] },
        { p: [w / 2, 0, 0.01] as [number, number, number], s: [0.04, h] as [number, number] },
      ].map((b, i) => (
        <mesh key={i} position={b.p}>
          <planeGeometry args={b.s} />
          <meshBasicMaterial color={frameColor} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

// ---------- Pantalla 2 en la pared del fondo ----------
function HoloScreens({
  focusedScreen,
  onFocusScreen,
  frameColor = "#00ffff",
}: {
  focusedScreen: number | null;
  onFocusScreen: (label: number) => void;
  frameColor?: string;
}) {
  const half = ROOM_SIZE / 2;
  const y = WALL_HEIGHT / 2;
  const off = 0.03;
  const rot: [number, number, number] = [0, 0, 0];
  const interactionMode = focusedScreen !== null;

  return (
    <HoloScreen
      kind="salas"
      label={2}
      position={[0, y, -half + off]}
      rotation={rot}
      width={WALL1_SALAS_WIDTH}
      height={WALL1_PANEL_HEIGHT}
      focused={focusedScreen === 2}
      interactionMode={interactionMode}
      onFocus={() => onFocusScreen(2)}
      frameColor={frameColor}
    />
  );
}

function SideWallScreen3({
  focusedScreen,
  onFocusScreen,
  frameColor = "#00ffff",
}: {
  focusedScreen: number | null;
  onFocusScreen: (label: number) => void;
  frameColor?: string;
}) {
  const half = ROOM_SIZE / 2;
  const y = WALL_HEIGHT / 2;
  const off = 0.03;
  const interactionMode = focusedScreen !== null;
  return (
    <HoloScreen
      kind="webpage"
      label={3}
      embedUrl={LOBBY_WEB_EMBED_URL}
      position={[half - off, y, 0]}
      rotation={[0, -Math.PI / 2, 0]}
      width={SIDE_WALL_SCREEN3_WIDTH}
      height={SIDE_WALL_SCREEN3_HEIGHT}
      focused={focusedScreen === 3}
      interactionMode={interactionMode}
      onFocus={() => onFocusScreen(3)}
      frameColor={frameColor}
    />
  );
}

function SideWallScreen4({
  focusedScreen,
  onFocusScreen,
  frameColor = "#00ffff",
}: {
  focusedScreen: number | null;
  onFocusScreen: (label: number) => void;
  frameColor?: string;
}) {
  const half = ROOM_SIZE / 2;
  const y = WALL_HEIGHT / 2;
  const off = 0.03;
  const interactionMode = focusedScreen !== null;
  return (
    <HoloScreen
      kind="screen4"
      label={4}
      position={[-half + off, y, 0]}
      rotation={[0, Math.PI / 2, 0]}
      width={SIDE_WALL_SCREEN4_WIDTH}
      height={SIDE_WALL_SCREEN4_HEIGHT}
      focused={focusedScreen === 4}
      interactionMode={interactionMode}
      onFocus={() => onFocusScreen(4)}
      frameColor={frameColor}
    />
  );
}

// ---------- Modern lounge set in the back-left corner ----------
function LoungeSet() {
  const half = ROOM_SIZE / 2;
  // Anchor near back-left corner
  const cx = -half + 3.2;
  const cz = -half + 3.2;

  const sofaColor = "#1a1a1d"; // matte charcoal
  const cushionColor = "#26262b";
  const tableTop = "#0f0f12";
  const tableBase = "#2a2a2f";

  return (
    <group position={[cx, 0, cz]}>
      {/* Rug under the set */}
      <mesh position={[0.4, 0.005, 0.4]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[5.2, 5.2]} />
        <meshStandardMaterial color="#0c0c10" roughness={0.95} metalness={0} />
      </mesh>

      {/* L-Sofa: long segment along -Z (against back wall direction) */}
      <group position={[0, 0, -1.6]}>
        {/* Base */}
        <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.2, 0.5, 1.0]} />
          <meshStandardMaterial color={sofaColor} roughness={0.6} metalness={0.05} />
        </mesh>
        {/* Backrest */}
        <mesh position={[0, 0.85, -0.4]} castShadow>
          <boxGeometry args={[3.2, 0.7, 0.2]} />
          <meshStandardMaterial color={sofaColor} roughness={0.6} metalness={0.05} />
        </mesh>
        {/* Cushions */}
        {[-1.0, 0, 1.0].map((x, i) => (
          <mesh key={i} position={[x, 0.6, 0.05]} castShadow>
            <boxGeometry args={[0.95, 0.25, 0.85]} />
            <meshStandardMaterial color={cushionColor} roughness={0.7} metalness={0.05} />
          </mesh>
        ))}
      </group>

      {/* L-Sofa: short segment along -X */}
      <group position={[-1.6, 0, 0]}>
        <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.0, 0.5, 2.4]} />
          <meshStandardMaterial color={sofaColor} roughness={0.6} metalness={0.05} />
        </mesh>
        <mesh position={[-0.4, 0.85, 0]} castShadow>
          <boxGeometry args={[0.2, 0.7, 2.4]} />
          <meshStandardMaterial color={sofaColor} roughness={0.6} metalness={0.05} />
        </mesh>
        {[-0.8, 0.2, 1.1].map((z, i) => (
          <mesh key={i} position={[0.05, 0.6, z]} castShadow>
            <boxGeometry args={[0.85, 0.25, 0.85]} />
            <meshStandardMaterial color={cushionColor} roughness={0.7} metalness={0.05} />
          </mesh>
        ))}
      </group>

      {/* Low coffee table */}
      <group position={[0.4, 0, 0.2]}>
        <mesh position={[0, 0.32, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.6, 0.08, 0.9]} />
          <meshStandardMaterial color={tableTop} roughness={0.25} metalness={0.6} />
        </mesh>
        <mesh position={[0, 0.16, 0]} castShadow>
          <boxGeometry args={[1.4, 0.24, 0.7]} />
          <meshStandardMaterial color={tableBase} roughness={0.5} metalness={0.3} />
        </mesh>
        {/* Subtle cyan underglow strip */}
        <mesh position={[0, 0.04, 0]}>
          <boxGeometry args={[1.5, 0.02, 0.8]} />
          <meshBasicMaterial color="#00ffff" toneMapped={false} />
        </mesh>
      </group>

      {/* Floor lamp accent (slim emissive pole) */}
      <group position={[1.7, 0, -1.7]}>
        <mesh position={[0, 1.1, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 2.2, 12]} />
          <meshStandardMaterial color="#1a1a1d" roughness={0.4} metalness={0.8} />
        </mesh>
        <mesh position={[0, 2.25, 0]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial
            color="#ff2bd6"
            emissive="#ff2bd6"
            emissiveIntensity={3}
            toneMapped={false}
          />
        </mesh>
        <pointLight position={[0, 2.25, 0]} color="#ff2bd6" intensity={8} distance={6} decay={2} />
      </group>
    </group>
  );
}

// ---------- Spotlight that highlights the lounge set ----------
function LoungeSpotlight() {
  const half = ROOM_SIZE / 2;
  const target = useRef<THREE.Object3D>(new THREE.Object3D());
  const { scene } = useThree();

  useEffect(() => {
    target.current.position.set(-half + 3.6, 0.4, -half + 3.6);
    scene.add(target.current);
    return () => {
      scene.remove(target.current);
    };
  }, [scene, half]);

  return (
    <spotLight
      position={[-half + 3.6, WALL_HEIGHT - 0.5, -half + 3.6]}
      angle={0.55}
      penumbra={0.6}
      intensity={45}
      distance={14}
      decay={2}
      color="#ffffff"
      castShadow
      target={target.current}
    />
  );
}

// ---------- Neon accent lights that bounce off the pearly walls ----------
function NeonAccents() {
  const half = ROOM_SIZE / 2 - 1.2;
  const y = WALL_HEIGHT - 1.2;
  const lights: { pos: [number, number, number]; color: string; intensity: number }[] = [
    { pos: [-half, y, -half], color: "#00ffff", intensity: 60 }, // cyan
    { pos: [half, y, half], color: "#ff2bd6", intensity: 55 }, // magenta
    { pos: [half, y, -half], color: "#9d4bff", intensity: 35 }, // violet accent
    { pos: [-half, y, half], color: "#00ffaa", intensity: 30 }, // mint accent
  ];

  return (
    <>
      {lights.map((l, i) => (
        <group key={i} position={l.pos}>
          <pointLight
            color={l.color}
            intensity={l.intensity}
            distance={26}
            decay={2}
          />
          <mesh>
            <sphereGeometry args={[0.13, 16, 16]} />
            <meshStandardMaterial
              color={l.color}
              emissive={l.color}
              emissiveIntensity={4}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}

// ---------- Tierra + Luna decorativas en el centro de la sala ----------
function MixedRealityScene({ active }: { active: boolean }) {
  const { gl, scene } = useThree();

  useEffect(() => {
    if (active) {
      gl.setClearAlpha(0);
      gl.setClearColor(0x000000, 0);
      scene.background = null;
      return;
    }

    gl.setClearAlpha(1);
    gl.setClearColor(0x050510, 1);
    scene.background = new THREE.Color("#050510");
  }, [active, gl, scene]);

  return null;
}

const MOBILE_TOUCH_LOOK_SENSITIVITY = 0.0045;

// ---------- First Person Controller (WASD) ----------
function FirstPersonController({
  enabled,
  mobileInputRef,
  mouseInputRef,
}: {
  enabled: boolean;
  mobileInputRef?: React.MutableRefObject<MobileMoveInput>;
  mouseInputRef?: React.MutableRefObject<ReturnType<typeof createMouseMoveInput>>;
}) {
  const { camera } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const velocity = useRef(new THREE.Vector3());
  const forward = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());

  useEffect(() => {
    camera.position.set(0, PLAYER_HEIGHT, 4);
  }, [camera]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => (keys.current[e.code] = true);
    const up = (e: KeyboardEvent) => (keys.current[e.code] = false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    if (enabled) return;
    keys.current = {};
  }, [enabled]);

  useFrame((_, delta) => {
    if (!enabled) return;

    camera.up.set(0, 1, 0);

    const k = keys.current;
    let moveForward =
      (k["KeyW"] ? 1 : 0) -
      (k["KeyS"] ? 1 : 0) +
      (mobileInputRef?.current.forward ?? 0) +
      (mouseInputRef?.current.forward ?? 0);
    let moveRight = (k["KeyD"] ? 1 : 0) - (k["KeyA"] ? 1 : 0) + (mobileInputRef?.current.right ?? 0);
    const moveMagnitude = Math.hypot(moveForward, moveRight);
    if (moveMagnitude > 1) {
      moveForward /= moveMagnitude;
      moveRight /= moveMagnitude;
    }

    if (moveForward === 0 && moveRight === 0) return;

    camera.getWorldDirection(forward.current);
    forward.current.y = 0;
    forward.current.normalize();

    right.current.crossVectors(forward.current, WORLD_UP).normalize();

    velocity.current
      .copy(forward.current)
      .multiplyScalar(moveForward)
      .addScaledVector(right.current, moveRight)
      .normalize()
      .multiplyScalar(MOVE_SPEED);

    camera.position.x += velocity.current.x * delta;
    camera.position.z += velocity.current.z * delta;

    const limit = ROOM_SIZE / 2 - PLAYER_RADIUS;
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -limit, limit);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -limit, limit);
    camera.position.y = PLAYER_HEIGHT;
  });

  return null;
}

function MobileTouchLook({ enabled }: { enabled: boolean }) {
  const { camera, gl } = useThree();
  const activePointerId = useRef<number | null>(null);
  const lastPosition = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const canvas = gl.domElement;

    const shouldIgnoreTarget = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return false;
      return Boolean(
        target.closest(
          "[data-lobby-move-pad], [data-lobby-ui], button, a, input, textarea, select, label, [role='button']",
        ),
      );
    };

    const applyDelta = (dx: number, dy: number) => {
      if (dx === 0 && dy === 0) return;
      camera.rotation.order = "YXZ";
      camera.rotation.y -= dx * MOBILE_TOUCH_LOOK_SENSITIVITY;
      camera.rotation.x = THREE.MathUtils.clamp(
        camera.rotation.x - dy * MOBILE_TOUCH_LOOK_SENSITIVITY,
        -1.35,
        1.35,
      );
      camera.up.set(0, 1, 0);
    };

    const endPointer = (event: PointerEvent) => {
      if (event.pointerId !== activePointerId.current) return;
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
      activePointerId.current = null;
      lastPosition.current = null;
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse") return;
      if (activePointerId.current !== null || shouldIgnoreTarget(event.target)) return;
      activePointerId.current = event.pointerId;
      lastPosition.current = { x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId);
      event.preventDefault();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "mouse") return;
      if (event.pointerId !== activePointerId.current || !lastPosition.current) return;
      const dx = event.clientX - lastPosition.current.x;
      const dy = event.clientY - lastPosition.current.y;
      lastPosition.current = { x: event.clientX, y: event.clientY };
      applyDelta(dx, dy);
      event.preventDefault();
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", endPointer);
    document.addEventListener("pointercancel", endPointer);

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", endPointer);
      document.removeEventListener("pointercancel", endPointer);
    };
  }, [camera, enabled, gl]);

  return null;
}

export default function NeonRoom({ variant = "lobby" }: NeonRoomProps) {
  const navigate = useNavigate();
  const isAulaVirtual = variant === "aula-virtual";
  const theme = ROOM_THEMES[variant];
  const isMobileCoarse = useMemo(() => isMobileCoarseDevice(), []);
  const usesFinePointer = useLobbyFinePointer();
  const isTouchOnlyLobby = isMobileCoarse && !usesFinePointer;
  const mobileMoveInput = useRef(createMobileMoveInput());
  const mouseMoveInput = useRef(createMouseMoveInput());
  const mobileLookFallbackRef = useRef(false);
  const [mobileLookFallback, setMobileLookFallback] = useState(false);
  const [locked, setLocked] = useState(false);
  const [escapeBarVisible, setEscapeBarVisible] = useState(true);
  const [focusedScreen, setFocusedScreen] = useState<number | null>(null);
  const [mixedRealityEnabled, setMixedRealityEnabled] = useState(false);
  const [mixedRealityLoading, setMixedRealityLoading] = useState(false);
  const [mixedRealityError, setMixedRealityError] = useState<string | null>(null);
  const mixedRealityStartInFlightRef = useRef(false);
  const [gyroLookEnabled, setGyroLookEnabled] = useState(false);
  const [gyroRecenterToken, setGyroRecenterToken] = useState(0);
  const [gyroError, setGyroError] = useState<string | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const focusedScreenRef = useRef<number | null>(null);
  const escapeBarVisibleRef = useRef(true);

  useEffect(() => {
    if (!usesFinePointer || !gyroLookEnabled) return;
    setGyroLookEnabled(false);
  }, [usesFinePointer, gyroLookEnabled]);

  useEffect(() => {
    if (!usesFinePointer) return;
    mobileMoveInput.current.forward = 0;
    mobileMoveInput.current.right = 0;
  }, [usesFinePointer]);

  useEffect(() => {
    mobileLookFallbackRef.current = mobileLookFallback;
  }, [mobileLookFallback]);

  useEffect(() => {
    return onOpCommand((cmd) => {
      if (cmd.type === "lobby.focusScreen") {
        setFocusedScreen(cmd.screen);
      }
      if (cmd.type === "lobby.unfocusScreen") {
        setFocusedScreen(null);
      }
      if (cmd.type === "lobby.gyro.enable") {
        setGyroLookEnabled(true);
      }
      if (cmd.type === "lobby.gyro.disable") {
        setGyroLookEnabled(false);
      }
      if (cmd.type === "lobby.gyro.toggle") {
        setGyroLookEnabled((p) => !p);
      }
      if (cmd.type === "lobby.gyro.recenter") {
        setGyroRecenterToken((t) => t + 1);
      }
    });
  }, []);

  /** Móvil + ratón: intentar pointer-lock; si falla → giro con clic izquierdo. */
  useEffect(() => {
    if (!isMobileCoarse || !usesFinePointer) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let failTimer: ReturnType<typeof setTimeout> | null = null;

    const clearFailTimer = () => {
      if (failTimer !== null) {
        clearTimeout(failTimer);
        failTimer = null;
      }
    };

    const onLockChange = () => {
      if (document.pointerLockElement === canvas) {
        clearFailTimer();
        setMobileLookFallback(false);
        mobileLookFallbackRef.current = false;
        setLocked(true);
        setEscapeBarVisible(false);
        return;
      }
      setLocked(false);
    };

    const markFallback = () => {
      clearFailTimer();
      setMobileLookFallback(true);
      mobileLookFallbackRef.current = true;
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
    };

    const tryPointerLock = () => {
      if (focusedScreenRef.current !== null || mobileLookFallbackRef.current) return;
      clearFailTimer();
      const result = canvas.requestPointerLock?.();
      if (result && typeof (result as Promise<void>).catch === "function") {
        (result as Promise<void>).catch(markFallback);
      }
      failTimer = setTimeout(() => {
        if (document.pointerLockElement !== canvas) markFallback();
      }, 700);
    };

    const onCanvasPointerDown = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      if (focusedScreenRef.current !== null) return;
      if (mobileLookFallbackRef.current) return;
      tryPointerLock();
    };

    document.addEventListener("pointerlockchange", onLockChange);
    document.addEventListener("pointerlockerror", markFallback);
    canvas.addEventListener("pointerdown", onCanvasPointerDown);

    return () => {
      clearFailTimer();
      document.removeEventListener("pointerlockchange", onLockChange);
      document.removeEventListener("pointerlockerror", markFallback);
      canvas.removeEventListener("pointerdown", onCanvasPointerDown);
    };
  }, [isMobileCoarse, usesFinePointer]);

  useEffect(() => {
    if (focusedScreen === null) return;
    mobileMoveInput.current.forward = 0;
    mobileMoveInput.current.right = 0;
    mouseMoveInput.current.forward = 0;
  }, [focusedScreen]);

  useEffect(() => {
    focusedScreenRef.current = focusedScreen;
  }, [focusedScreen]);


  useEffect(() => {
    escapeBarVisibleRef.current = escapeBarVisible;
  }, [escapeBarVisible]);

  useEffect(() => {
    return () => {
      stopCameraStream(cameraVideoRef.current);
    };
  }, []);

  useEffect(() => {
    if (!mixedRealityEnabled) return;

    const syncCamera = () => {
      void applyCameraTrackConstraints(cameraVideoRef.current);
    };

    syncCamera();
    window.addEventListener("resize", syncCamera);
    return () => window.removeEventListener("resize", syncCamera);
  }, [mixedRealityEnabled]);

  const requestMovementLock = () => {
    if (!usesFinePointer) return;
    window.requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas || focusedScreenRef.current !== null) return;
      void canvas.requestPointerLock?.();
    });
  };

  const handleLobbyEscape = useCallback(() => {
    if (focusedScreenRef.current !== null) {
      setFocusedScreen(null);
      setEscapeBarVisible(true);
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
      return;
    }

    if (document.pointerLockElement) {
      setEscapeBarVisible(true);
      document.exitPointerLock();
    }
  }, []);

  const focusScreen = (label: number) => {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
    setFocusedScreen(label);
    setEscapeBarVisible(false);
    setLocked(false);
  };

  // Mobile/desktop: tap fuera del iframe enfocado (sobre el canvas 3D) deshace el foco
  // y vuelve a habilitar el pad/touch-look o el pointer-lock. En el iframe drei `<Html>`
  // se monta como hermano del canvas, asi que los toques sobre la pantalla enfocada NO
  // llegan a este listener — solo los que caen en la zona 3D.
  useEffect(() => {
    if (focusedScreen === null) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onCanvasPointerDownOutside = () => {
      setFocusedScreen(null);
      setEscapeBarVisible(true);
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
    };

    canvas.addEventListener("pointerdown", onCanvasPointerDownOutside);
    return () => {
      canvas.removeEventListener("pointerdown", onCanvasPointerDownOutside);
    };
  }, [focusedScreen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      if (focusedScreenRef.current !== null) {
        event.preventDefault();
        setFocusedScreen(null);
        setEscapeBarVisible(true);
        if (document.pointerLockElement) {
          document.exitPointerLock();
        }
        return;
      }

      if (document.pointerLockElement) {
        event.preventDefault();
        setEscapeBarVisible(true);
        document.exitPointerLock();
        return;
      }

      if (escapeBarVisibleRef.current) {
        event.preventDefault();
        setEscapeBarVisible(false);
        requestMovementLock();
        return;
      }

      event.preventDefault();
      setEscapeBarVisible(true);
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, []);

  const startMixedReality = useCallback(async () => {
    if (mixedRealityEnabled || mixedRealityStartInFlightRef.current) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      setMixedRealityError(MIXED_REALITY_CAMERA_ERROR);
      setMixedRealityLoading(false);
      return;
    }

    mixedRealityStartInFlightRef.current = true;
    setMixedRealityLoading(true);
    setMixedRealityError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: getLobbyCameraVideoConstraints(),
      });
      const video = cameraVideoRef.current;
      if (!video) {
        stream.getTracks().forEach((track) => track.stop());
        throw new Error("camera-video-missing");
      }

      video.srcObject = stream;
      await video.play();
      await applyCameraTrackConstraints(video);
      setMixedRealityEnabled(true);
    } catch {
      stopCameraStream(cameraVideoRef.current);
      setMixedRealityEnabled(false);
      setMixedRealityError(MIXED_REALITY_CAMERA_ERROR);
    } finally {
      mixedRealityStartInFlightRef.current = false;
      setMixedRealityLoading(false);
    }
  }, [mixedRealityEnabled]);

  const stopMixedReality = useCallback(() => {
    stopCameraStream(cameraVideoRef.current);
    setMixedRealityEnabled(false);
    setMixedRealityError(null);
    setMixedRealityLoading(false);
  }, []);

  const toggleMixedReality = useCallback(async () => {
    if (mixedRealityStartInFlightRef.current) return;

    if (mixedRealityEnabled) {
      stopMixedReality();
      return;
    }

    await startMixedReality();
  }, [mixedRealityEnabled, startMixedReality, stopMixedReality]);

  const autoMobileCameraStartedRef = useRef(false);
  useEffect(() => {
    if (!isMobileCoarse || autoMobileCameraStartedRef.current) return;
    autoMobileCameraStartedRef.current = true;
    void startMixedReality();
  }, [isMobileCoarse, startMixedReality]);

  const activateGyroLook = useCallback(async () => {
    setGyroError(null);
    const permission = await requestDeviceOrientationPermission();
    if (permission === "unsupported") {
      setGyroError("Giroscopio no disponible en este dispositivo.");
      return;
    }
    if (permission === "denied") {
      setGyroError("Permiso de orientación denegado. Actívalo en Ajustes del navegador.");
      return;
    }
    setGyroLookEnabled(true);
  }, []);

  const deactivateGyroLook = useCallback(() => {
    setGyroLookEnabled(false);
    setGyroError(null);
  }, []);

  const mixedRealityActive = mixedRealityEnabled;
  const gyroLookActive = gyroLookEnabled && focusedScreen === null;
  const mobileTouchLookActive = isTouchOnlyLobby && focusedScreen === null && !gyroLookEnabled;
  const usesPointerLockControls = usesFinePointer && focusedScreen === null && !mobileLookFallback;
  const mobileWheelSpinActive = isMobileCoarse && usesFinePointer && focusedScreen === null;
  const mobileMouseLookActive =
    isMobileCoarse && usesFinePointer && !mobileLookFallback && focusedScreen === null && !locked;

  return (
    <div className={`relative h-screen w-screen ${mixedRealityActive ? "bg-transparent" : isAulaVirtual ? "bg-[#EDE8DF]" : "bg-black"}`}>
      <video
        ref={cameraVideoRef}
        playsInline
        autoPlay
        muted
        aria-hidden
        style={
          mixedRealityEnabled
            ? {
                position: "fixed",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                zIndex: 0,
                pointerEvents: "none",
              }
            : {
                position: "fixed",
                width: 1,
                height: 1,
                opacity: 0,
                pointerEvents: "none",
                overflow: "hidden",
              }
        }
      />
      <button
        type="button"
        data-lobby-ui
        onClick={() => navigate(isAulaVirtual ? "/3d" : "/")}
        aria-label={isAulaVirtual ? "Volver a modelos 3D" : "Volver al perfil"}
        className={`pointer-events-auto fixed left-4 top-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border bg-slate-950/95 backdrop-blur-md transition disabled:cursor-wait disabled:opacity-70 ${
          isAulaVirtual
            ? "border-amber-400/60 text-amber-100 shadow-[0_0_24px_-6px_rgba(251,191,36,0.75)] hover:border-amber-300 hover:bg-slate-900 hover:text-white"
            : "border-cyan-400/60 text-cyan-200 shadow-[0_0_28px_-4px_rgba(34,211,238,0.95),inset_0_0_18px_-10px_rgba(34,211,238,0.55)] hover:border-cyan-300 hover:bg-slate-900 hover:text-white hover:shadow-[0_0_34px_-2px_rgba(34,211,238,1)]"
        }`}
        style={{
          top: "max(1rem, env(safe-area-inset-top))",
          left: "max(1rem, env(safe-area-inset-left))",
        }}
      >
        <ArrowLeft className="h-5 w-5" aria-hidden />
      </button>
      <button
        type="button"
        data-lobby-ui
        onClick={() => void toggleMixedReality()}
        disabled={mixedRealityLoading}
        aria-label={mixedRealityEnabled ? "Desactivar modo realidad mixta" : "Activar modo realidad mixta"}
        className={`pointer-events-auto fixed right-4 top-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border bg-slate-950/95 backdrop-blur-md transition hover:bg-slate-900 disabled:cursor-wait disabled:opacity-70 ${
          mixedRealityEnabled
            ? "border-violet-400/70 text-violet-200 hover:border-violet-300 hover:text-white"
            : isAulaVirtual
              ? "border-amber-400/60 text-amber-100 shadow-[0_0_24px_-6px_rgba(251,191,36,0.75)] hover:border-amber-300 hover:text-white"
              : "border-cyan-400/60 text-cyan-200 shadow-[0_0_28px_-4px_rgba(34,211,238,0.95),inset_0_0_18px_-10px_rgba(34,211,238,0.55)] hover:border-cyan-300 hover:text-white hover:shadow-[0_0_34px_-2px_rgba(34,211,238,1)]"
        }`}
        style={{
          top: "max(1rem, env(safe-area-inset-top))",
          right: "max(1rem, env(safe-area-inset-right))",
        }}
      >
        <Camera className="h-5 w-5" aria-hidden />
      </button>
      {mixedRealityError && (
        <p
          className="pointer-events-none fixed right-4 top-20 z-20 max-w-[min(92vw,18rem)] rounded-xl border border-rose-300/35 bg-black/75 px-3 py-2 text-xs text-rose-100 backdrop-blur-md"
          style={{
            top: "max(4.5rem, calc(env(safe-area-inset-top) + 3.5rem))",
          }}
          role="alert"
        >
          {mixedRealityError}
        </p>
      )}
      <Canvas
        className="relative z-10"
        camera={{ fov: 75, near: 0.1, far: 200, position: [0, PLAYER_HEIGHT, 4] }}
        dpr={[1, MAX_WEBGL_PIXEL_RATIO]}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          canvasRef.current = gl.domElement;
          gl.domElement.style.touchAction = "none";
          applyPixelRatioCap(gl);
        }}
      >
          <MixedRealityScene active={mixedRealityActive} />
          {!mixedRealityActive && <color attach="background" args={[theme.backgroundColor]} />}

          {!mixedRealityActive && !isAulaVirtual && (
          <Stars
            radius={80}
            depth={50}
            count={4000}
            factor={4}
            saturation={0}
            fade
            speed={0.5}
          />
          )}

          <ambientLight intensity={theme.ambientLightIntensity} />
          <directionalLight position={[5, 8, 5]} intensity={theme.directionalLightIntensity} color={theme.directionalLightColor} />
          <pointLight position={[-8.5, 5.5, 0]} intensity={theme.fillLightIntensity} distance={14} decay={2} color={theme.fillLightColor} />

          <Room structureVisible={!mixedRealityActive} theme={theme} />
          <HoloScreens
            focusedScreen={focusedScreen}
            onFocusScreen={focusScreen}
            frameColor={theme.screenFrameColor}
          />
          <SideWallScreen3
            focusedScreen={focusedScreen}
            onFocusScreen={focusScreen}
            frameColor={theme.screenFrameColor}
          />
          <SideWallScreen4
            focusedScreen={focusedScreen}
            onFocusScreen={focusScreen}
            frameColor={theme.screenFrameColor}
          />
          {!isAulaVirtual && (
            <>
              <NeonAccents />
              <LoungeSet />
              <LoungeSpotlight />
            </>
          )}

        <Suspense fallback={null}>
          {isAulaVirtual ? (
            <>
              <AulaVirtualClassroomDecor roomSize={ROOM_SIZE} wallHeight={WALL_HEIGHT} />
              <AulaVirtualWallGallery roomSize={ROOM_SIZE} wallHeight={WALL_HEIGHT} />
            </>
          ) : (
            <>
              <LobbyDecorEarthMoon position={[ROOM_SIZE / 2 - 2.15, WALL_HEIGHT * 0.45, 0]} scale={1.26} />
              <LobbyDecorHeartWall position={[0, WALL_HEIGHT / 2, ROOM_SIZE / 2 - 0.45]} />
              <LobbyDecorFarolLantern position={[-5, WALL_HEIGHT * 0.55, -ROOM_SIZE / 2 + 0.45]} />
            </>
          )}
        </Suspense>
        <FirstPersonController
          enabled={focusedScreen === null}
          mobileInputRef={mobileMoveInput}
          mouseInputRef={mouseMoveInput}
        />
        <LobbyDeviceOrientationLook enabled={gyroLookActive} recenterToken={gyroRecenterToken} />
        <MobileTouchLook enabled={mobileTouchLookActive} />
        <LobbyMobileMouseLook enabled={mobileMouseLookActive} />
        <LobbyMobileWheelOrbitSpin enabled={mobileWheelSpinActive} />

        {usesPointerLockControls && (
          <PointerLockControls
            onLock={() => {
              setLocked(true);
              setEscapeBarVisible(false);
            }}
            onUnlock={() => setLocked(false)}
          />
        )}
      </Canvas>

      <MobileLobbyMovePad
        enabled={isTouchOnlyLobby && focusedScreen === null}
        inputRef={mobileMoveInput}
      />

      <LobbyMouseButtonControls
        enabled={usesFinePointer}
        movementEnabled={focusedScreen === null}
        inputRef={mouseMoveInput}
        onEscape={handleLobbyEscape}
      />

      {isTouchOnlyLobby && (
        <LobbyGyroToggleButton
          active={gyroLookEnabled}
          onActivate={() => void activateGyroLook()}
          onDeactivate={deactivateGyroLook}
          onRecenter={() => setGyroRecenterToken((t) => t + 1)}
          errorMessage={gyroError}
        />
      )}

      {/*
        Barra de avisos inferior ("Pearl Room · WASD mover · ratón mirar")
        eliminada por pedido del usuario: estorbaba visualmente en PC y
        mobile. El state `escapeBarVisible` se conserva por compatibilidad
        con el resto de la lógica del lobby (los `setEscapeBarVisible(...)`
        siguen ahí pero ahora son no-ops visuales).
      */}

      {(locked || mobileMouseLookActive || mobileWheelSpinActive) && focusedScreen === null && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80 mix-blend-difference" />
      )}
    </div>
  );
}
