import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, PointerLockControls, Stars, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import {
  applyPixelRatioCap,
  isMobileCoarseDevice,
  MAX_WEBGL_PIXEL_RATIO,
} from "@/lib/webglRendererPrefs";
import MobileLobbyMovePad, {
  createMobileMoveInput,
  type MobileMoveInput,
} from "@/components/lobby/MobileLobbyMovePad";
import { LobbyScreenOneHub } from "@/components/lobby/LobbyScreenOneHub";
import { VrSession } from "@/components/lobby/VrSession";

const ROOM_SIZE = 20;
const WALL_HEIGHT = 8;
const PLAYER_HEIGHT = 3.045;
const PLAYER_RADIUS = 0.4;
const MOVE_SPEED = 4.5;
const WORLD_UP = new THREE.Vector3(0, 1, 0);

const WALL_COLOR = "#EAECEE";
const LOBBY_SCREEN_HTML_Z_INDEX: [number, number] = [10000, 0];
const LOBBY_SCREEN_BACKGROUND_Z_INDEX: [number, number] = [40, 0];
/**
 * Modelo "El Corazón" servido offline-first desde /public/assets/models/.
 * Root-relativo para que Capacitor WebView (`androidScheme: "https"`) lo cargue
 * desde `https://localhost/assets/...` sin red.
 */
const LOBBY_SCREEN_4_CLOUD_MODEL_URL = "/assets/models/corazon.glb";

const WALL_SCREEN_EMBEDS = [
  "about:blank",
  "https://web.whatsapp.com/",
  "https://www.youtube.com/embed/kJQP7kiw5Fk",
  LOBBY_SCREEN_4_CLOUD_MODEL_URL,
] as const;

type LobbyScreenUrls = [string, string, string, string];

const LOBBY_SCREEN_URLS_STORAGE_KEY = "onniverso.lobby.screen_urls";

function defaultLobbyScreenUrls(): LobbyScreenUrls {
  return [...WALL_SCREEN_EMBEDS];
}

function readStoredLobbyScreenUrls(): LobbyScreenUrls | null {
  try {
    const raw = localStorage.getItem(LOBBY_SCREEN_URLS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length !== 4 || !parsed.every((value) => typeof value === "string")) {
      return null;
    }
    const urls = [...parsed] as LobbyScreenUrls;
    if (urls[0] === "https://onnivers.com" || urls[0] === "https://www.google.com") {
      urls[0] = "about:blank";
    }
    if (urls[3] === "https://www.youtube.com/embed/RgKAFK5djSk") {
      urls[3] = LOBBY_SCREEN_4_CLOUD_MODEL_URL;
    }
    // Migración offline-first: cualquier URL del Cloudinary anterior pasa al .glb local.
    if (
      urls[3] ===
      "https://res.cloudinary.com/dfsabdxup/image/upload/v1778502197/el_corazon_dbhvfn.glb"
    ) {
      urls[3] = LOBBY_SCREEN_4_CLOUD_MODEL_URL;
    }
    return urls;
  } catch {
    return null;
  }
}

function persistLobbyScreenUrls(urls: LobbyScreenUrls) {
  try {
    localStorage.setItem(LOBBY_SCREEN_URLS_STORAGE_KEY, JSON.stringify(urls));
  } catch {
    /* ignore */
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

function normalizeLobbyScreenUrl(url: string, index: number): string {
  const trimmed = url.trim();
  if (!trimmed) return WALL_SCREEN_EMBEDS[index];
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  return trimmed;
}

const WALL_SCREEN_WIDTH = 8;
const WALL_SCREEN_HEIGHT = 4.5;

function lobbyWallScreenCaption(label: number): string {
  return label === 4 ? "3D" : String(label);
}

function WallSceneGlbModel({
  url,
  width,
  height,
}: {
  url: string;
  width: number;
  height: number;
}) {
  const { scene } = useGLTF(url, false, false, (loader) => {
    loader.setCrossOrigin("anonymous");
  });
  const model = useMemo(() => {
    const root = scene.clone(true);
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    root.position.sub(center);
    const fitScale = Math.min(
      (width * 0.92) / Math.max(size.x, 1e-6),
      (height * 0.92) / Math.max(size.y, 1e-6),
      (width * 0.92) / Math.max(size.z, 1e-6),
    );
    root.scale.setScalar(fitScale);
    return root;
  }, [scene, url, width, height]);

  return <primitive object={model} />;
}

function WallSceneGlb({
  url,
  position,
  rotation,
}: {
  url: string;
  position: [number, number, number];
  rotation: [number, number, number];
}) {
  const spinRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!spinRef.current) return;
    spinRef.current.rotation.y += delta * 0.42;
  });

  return (
    <group position={position} rotation={rotation}>
      <group ref={spinRef}>
        <Suspense fallback={null}>
          <WallSceneGlbModel
            key={url}
            url={url}
            width={WALL_SCREEN_WIDTH}
            height={WALL_SCREEN_HEIGHT}
          />
        </Suspense>
      </group>
      <Html
        transform
        position={[0, -((WALL_SCREEN_HEIGHT / 2 + 0.35) * 1.1), 0.05]}
        scale={((WALL_SCREEN_WIDTH / 800) * 36.225) * 1.575}
        zIndexRange={LOBBY_SCREEN_HTML_Z_INDEX}
        style={{ pointerEvents: "none" }}
      >
        <div
          style={{
            color: "#020617",
            fontSize: "86px",
            fontWeight: 900,
            lineHeight: 1,
            textAlign: "center",
            letterSpacing: "0.02em",
            textShadow: "0 0 18px rgba(255,255,255,0.65), 0 2px 10px rgba(15,23,42,0.35)",
            WebkitTextStroke: "2px rgba(255,255,255,0.75)",
          }}
        >
          3D
        </div>
      </Html>
    </group>
  );
}

const CENTER_SCREEN_EMBED_URL = "https://onnivers.com/nuestras-salas";

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
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  width: number;
  height: number;
  visible: boolean;
}) {
  return (
    <mesh position={position} rotation={rotation} receiveShadow visible={visible}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial
        color={WALL_COLOR}
        roughness={0.2}
        metalness={0.1}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ---------- Ceiling ----------
function Ceiling({ visible }: { visible: boolean }) {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, WALL_HEIGHT, 0]} receiveShadow visible={visible}>
      <planeGeometry args={[ROOM_SIZE, ROOM_SIZE]} />
      <meshStandardMaterial color="#F0F0F0" roughness={0.3} metalness={0.1} />
    </mesh>
  );
}

// ---------- Floor with cyan neon grid ----------
function Floor({ visible }: { visible: boolean }) {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow visible={visible}>
        <planeGeometry args={[ROOM_SIZE, ROOM_SIZE]} />
        <meshStandardMaterial color="#1a1d24" roughness={0.4} metalness={0.3} />
      </mesh>
      <gridHelper
        args={[ROOM_SIZE, ROOM_SIZE, "#00ffff", "#00ffff"]}
        position={[0, 0.01, 0]}
        visible={visible}
      />
    </>
  );
}

// ---------- Room with 4 walls ----------
function Room({ structureVisible }: { structureVisible: boolean }) {
  const half = ROOM_SIZE / 2;
  const midY = WALL_HEIGHT / 2;
  return (
    <>
      <Floor visible={structureVisible} />
      <Ceiling visible={structureVisible} />
      <Wall position={[0, midY, -half]} rotation={[0, 0, 0]} width={ROOM_SIZE} height={WALL_HEIGHT} visible={structureVisible} />
      <Wall position={[0, midY, half]} rotation={[0, Math.PI, 0]} width={ROOM_SIZE} height={WALL_HEIGHT} visible={structureVisible} />
      <Wall position={[-half, midY, 0]} rotation={[0, Math.PI / 2, 0]} width={ROOM_SIZE} height={WALL_HEIGHT} visible={structureVisible} />
      <Wall position={[half, midY, 0]} rotation={[0, -Math.PI / 2, 0]} width={ROOM_SIZE} height={WALL_HEIGHT} visible={structureVisible} />
    </>
  );
}

// ---------- Holographic neon screen (reusable on any wall) ----------
function HoloScreen({
  position,
  rotation,
  embedUrl,
  label,
  focused,
  interactionMode,
  onFocus,
  uiOverlayOpen = false,
  width = 8,
  height = 4.5,
  frameColor = "#00ffff",
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  embedUrl: string;
  label: number;
  focused: boolean;
  interactionMode: boolean;
  onFocus: () => void;
  uiOverlayOpen?: boolean;
  width?: number;
  height?: number;
  frameColor?: string;
}) {
  const w = width;
  const h = height;
  const embedWidth = 800;
  const embedHeight = Math.round((embedWidth * h) / w);
  const htmlScale = (w / embedWidth) * 36.225;
  const htmlZIndexRange = uiOverlayOpen ? LOBBY_SCREEN_BACKGROUND_Z_INDEX : LOBBY_SCREEN_HTML_Z_INDEX;
  const screenPointerEvents = uiOverlayOpen ? "none" : !interactionMode || focused ? "auto" : "none";

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
            {label === 1 ? (
              <LobbyScreenOneHub width={embedWidth} height={embedHeight} />
            ) : (
              <iframe
                key={embedUrl}
                src={embedUrl}
                width={embedWidth}
                height={embedHeight}
                title={label === 4 ? "Zona 3D (GLB / GLTF)" : `Pantalla ${label}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                sandbox={
                  label === 2
                    ? "allow-forms allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                    : undefined
                }
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
      <Html
        transform
        position={[0, -((h / 2 + 0.35) * 1.1), 0.05]}
        scale={htmlScale * 1.575}
        zIndexRange={htmlZIndexRange}
        style={{ pointerEvents: "none" }}
      >
        <div
          style={{
            color: "#020617",
            fontSize: "86px",
            fontWeight: 900,
            lineHeight: 1,
            textAlign: "center",
            letterSpacing: "0.02em",
            textShadow: "0 0 18px rgba(255,255,255,0.65), 0 2px 10px rgba(15,23,42,0.35)",
            WebkitTextStroke: "2px rgba(255,255,255,0.75)",
          }}
        >
          {lobbyWallScreenCaption(label)}
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

// ---------- 4 holographic screens, one centered on each wall ----------
function HoloScreens({
  focusedScreen,
  onFocusScreen,
  screenUrls,
  screenLinksOpen,
}: {
  focusedScreen: number | null;
  onFocusScreen: (label: number) => void;
  screenUrls: LobbyScreenUrls;
  screenLinksOpen: boolean;
}) {
  const half = ROOM_SIZE / 2;
  const y = WALL_HEIGHT / 2;
  const off = 0.03;
  const interactionMode = focusedScreen !== null;
  const screenProps = (label: number, embedUrl: string, position: [number, number, number], rotation: [number, number, number]) => ({
    position,
    rotation,
    embedUrl,
    label,
    focused: focusedScreen === label,
    interactionMode,
    uiOverlayOpen: screenLinksOpen,
    onFocus: () => onFocusScreen(label),
  });

  return (
    <>
      {/* Back wall (-Z) */}
      <HoloScreen
        {...screenProps(1, screenUrls[0], [0, y, -half + off], [0, 0, 0])}
      />
      {/* Front wall (+Z) */}
      <HoloScreen
        {...screenProps(2, screenUrls[1], [0, y, half - off], [0, Math.PI, 0])}
      />
      {/* Left wall (-X) */}
      <HoloScreen
        {...screenProps(3, screenUrls[2], [-half + off, y, 0], [0, Math.PI / 2, 0])}
      />
      {/* Right wall (+X) */}
      {isGlbSource(screenUrls[3]) ? (
        <WallSceneGlb
          url={screenUrls[3]}
          position={[half - off, y, 0]}
          rotation={[0, -Math.PI / 2, 0]}
        />
      ) : (
        <HoloScreen
          {...screenProps(4, screenUrls[3], [half - off, y, 0], [0, -Math.PI / 2, 0])}
        />
      )}
    </>
  );
}

function ForcedFloatingVideoScreen({ screenLinksOpen }: { screenLinksOpen: boolean }) {
  const htmlZIndexRange = screenLinksOpen ? LOBBY_SCREEN_BACKGROUND_Z_INDEX : LOBBY_SCREEN_HTML_Z_INDEX;

  return (
    <group position={[0, 2.25, 0]}>
      <Html transform position={[0, 0, 0]} scale={0.5} zIndexRange={htmlZIndexRange}>
        <iframe
          src={CENTER_SCREEN_EMBED_URL}
          width={1024}
          height={576}
          title="Nuestras Salas"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          style={{
            border: "0",
            display: "block",
            background: "#02030a",
            pointerEvents: screenLinksOpen ? "none" : "auto",
          }}
        />
      </Html>
    </group>
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

// ---------- Earth + Moon attached to the camera ----------
function EarthMoonAnchor() {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null!);
  const moonPivotRef = useRef<THREE.Group>(null!);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    camera.add(group);
    return () => {
      camera.remove(group);
    };
  }, [camera]);

  useFrame((_, delta) => {
    if (moonPivotRef.current) {
      moonPivotRef.current.rotation.y += delta * 0.8;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, -5]}>
      {/* Earth */}
      <mesh>
        <sphereGeometry args={[0.7, 48, 48]} />
        <meshStandardMaterial
          color="#1e6fff"
          roughness={0.55}
          metalness={0.15}
          emissive="#0a2a6b"
          emissiveIntensity={0.4}
        />
      </mesh>

      {/* Soft halo to keep Earth readable against bright walls */}
      <mesh>
        <sphereGeometry args={[0.78, 32, 32]} />
        <meshBasicMaterial color="#3aa0ff" transparent opacity={0.12} />
      </mesh>

      {/* Key light at the Earth */}
      <pointLight color="#ffffff" intensity={3.2} distance={9} decay={2} />

      {/* Moon orbiting */}
      <group ref={moonPivotRef}>
        <mesh position={[1.6, 0.2, 0]}>
          <sphereGeometry args={[0.18, 32, 32]} />
          <meshStandardMaterial
            color="#ffffff"
            roughness={0.9}
            metalness={0}
            emissive="#bcd4ff"
            emissiveIntensity={0.15}
          />
        </mesh>
      </group>
    </group>
  );
}

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
}: {
  enabled: boolean;
  mobileInputRef?: React.MutableRefObject<MobileMoveInput>;
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
    let moveForward = (k["KeyW"] ? 1 : 0) - (k["KeyS"] ? 1 : 0) + (mobileInputRef?.current.forward ?? 0);
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
          "[data-lobby-move-pad], [data-lobby-ui], [data-lobby-screen-links], button, a, input, textarea, select, label, [role='button']",
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

export default function NeonRoom() {
  const navigate = useNavigate();
  const isMobileTouch = useMemo(() => isMobileCoarseDevice(), []);
  const mobileMoveInput = useRef(createMobileMoveInput());
  const [locked, setLocked] = useState(false);
  const [escapeBarVisible, setEscapeBarVisible] = useState(true);
  const [focusedScreen, setFocusedScreen] = useState<number | null>(null);
  const [mixedRealityEnabled, setMixedRealityEnabled] = useState(false);
  const [mixedRealityLoading, setMixedRealityLoading] = useState(false);
  const [mixedRealityError, setMixedRealityError] = useState<string | null>(null);
  const mixedRealityStartInFlightRef = useRef(false);
  const [screenUrls, setScreenUrls] = useState<LobbyScreenUrls>(
    () => readStoredLobbyScreenUrls() ?? defaultLobbyScreenUrls(),
  );
  const [screenLinksOpen, setScreenLinksOpen] = useState(false);
  const [screenUrlDrafts, setScreenUrlDrafts] = useState<LobbyScreenUrls>(
    () => readStoredLobbyScreenUrls() ?? defaultLobbyScreenUrls(),
  );
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const focusedScreenRef = useRef<number | null>(null);
  const escapeBarVisibleRef = useRef(true);

  useEffect(() => {
    if (focusedScreen === null) return;
    mobileMoveInput.current.forward = 0;
    mobileMoveInput.current.right = 0;
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
    if (isMobileTouch) return;
    window.requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas || focusedScreenRef.current !== null) return;
      void canvas.requestPointerLock?.();
    });
  };

  const focusScreen = (label: number) => {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
    setFocusedScreen(label);
    setEscapeBarVisible(false);
    setLocked(false);
  };

  const openScreenLinksPanel = () => {
    setScreenUrlDrafts(screenUrls);
    setScreenLinksOpen(true);
  };

  const applyScreenLinks = () => {
    const next = screenUrlDrafts.map((url, index) => normalizeLobbyScreenUrl(url, index)) as LobbyScreenUrls;
    setScreenUrls(next);
    setScreenUrlDrafts(next);
    persistLobbyScreenUrls(next);
    setScreenLinksOpen(false);
  };

  useEffect(() => {
    const screenFourUrl = screenUrls[3];
    if (isGlbSource(screenFourUrl)) {
      useGLTF.preload(screenFourUrl);
    }
  }, [screenUrls]);

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

  const mixedRealityActive = mixedRealityEnabled;

  return (
    <div className={`relative h-screen w-screen ${mixedRealityActive ? "bg-transparent" : "bg-black"}`}>
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
        onClick={() => navigate("/")}
        aria-label="Volver al perfil"
        className="pointer-events-auto fixed left-4 top-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-cyan-400/60 bg-slate-950/95 text-cyan-200 shadow-[0_0_28px_-4px_rgba(34,211,238,0.95),inset_0_0_18px_-10px_rgba(34,211,238,0.55)] backdrop-blur-md transition hover:border-cyan-300 hover:bg-slate-900 hover:text-white hover:shadow-[0_0_34px_-2px_rgba(34,211,238,1)]"
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
        className={`pointer-events-auto fixed right-4 top-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border bg-slate-950/95 font-display text-xs font-bold tracking-[0.18em] shadow-[0_0_28px_-4px_rgba(34,211,238,0.95),inset_0_0_18px_-10px_rgba(34,211,238,0.55)] backdrop-blur-md transition hover:bg-slate-900 hover:shadow-[0_0_34px_-2px_rgba(34,211,238,1)] disabled:cursor-wait disabled:opacity-70 ${
          mixedRealityEnabled
            ? "border-violet-400/70 text-violet-200 hover:border-violet-300 hover:text-white"
            : "border-cyan-400/60 text-cyan-200 hover:border-cyan-300 hover:text-white"
        }`}
        style={{
          top: "max(1rem, env(safe-area-inset-top))",
          right: "max(1rem, env(safe-area-inset-right))",
        }}
      >
        RM
      </button>
      {mixedRealityError && (
        <p
          className="pointer-events-none fixed right-4 top-20 z-20 max-w-[min(92vw,18rem)] rounded-xl border border-rose-300/35 bg-black/75 px-3 py-2 text-xs text-rose-100 backdrop-blur-md"
          style={{ top: "max(4.5rem, calc(env(safe-area-inset-top) + 3.5rem))" }}
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
          {/*
            WebXR / Cardboard: habilita gl.xr e inyecta el botón "ENTER VR" si
            navigator.xr soporta sesión inmersiva. Si no hay soporte (PC sin
            headset, Capacitor WebView sin WebXR), no aparece nada y el lobby
            queda en mono. Detalles en VrSession.tsx.
          */}
          <VrSession />
          <MixedRealityScene active={mixedRealityActive} />
          {!mixedRealityActive && <color attach="background" args={["#050510"]} />}

          {/* Background stars (still visible through the holographic window) */}
          {!mixedRealityActive && (
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

          {/* Soft fill so pearly walls read clean */}
          <ambientLight intensity={0.55} />
          {/* Subtle directional fill for depth on the white walls */}
          <directionalLight position={[5, 8, 5]} intensity={0.4} color="#ffffff" />

          <Room structureVisible={!mixedRealityActive} />
          <HoloScreens
            focusedScreen={focusedScreen}
            onFocusScreen={focusScreen}
            screenUrls={screenUrls}
            screenLinksOpen={screenLinksOpen}
          />
          <ForcedFloatingVideoScreen screenLinksOpen={screenLinksOpen} />
          <NeonAccents />
          <LoungeSet />
          <LoungeSpotlight />

        <EarthMoonAnchor />
        <FirstPersonController enabled={focusedScreen === null} mobileInputRef={mobileMoveInput} />
        <MobileTouchLook enabled={isMobileTouch && focusedScreen === null} />

        {focusedScreen === null && !isMobileTouch && (
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
        enabled={isMobileTouch && focusedScreen === null}
        inputRef={mobileMoveInput}
      />

      {focusedScreen === null && (
        <div className="pointer-events-none fixed bottom-0 right-0 z-[12000] pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))]">
          {!screenLinksOpen ? (
            <button
              type="button"
              data-lobby-ui
              onClick={openScreenLinksPanel}
              aria-label="Configurar URLs de las pantallas"
              className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-cyan-400/60 bg-slate-950/95 font-display text-[10px] font-bold tracking-[0.12em] text-cyan-200 shadow-[0_0_28px_-4px_rgba(34,211,238,0.95),inset_0_0_18px_-10px_rgba(34,211,238,0.55)] backdrop-blur-md transition hover:border-cyan-300 hover:bg-slate-900 hover:text-white hover:shadow-[0_0_34px_-2px_rgba(34,211,238,1)]"
            >
              URLs
            </button>
          ) : (
            <div
              data-lobby-screen-links
              data-lobby-ui
              className="pointer-events-auto w-[min(84vw,15.5rem)] rounded-[1.35rem] border-2 border-cyan-300/55 bg-slate-950/95 p-2.5 shadow-[0_14px_34px_-16px_rgba(34,211,238,0.95),inset_0_0_0_1px_rgba(255,255,255,0.06)] backdrop-blur-xl"
            >
              <div className="mb-2 flex items-center gap-2">
                <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cyan-200/70 bg-gradient-to-br from-cyan-400/25 via-slate-900 to-slate-950 shadow-[0_0_16px_-4px_rgba(34,211,238,0.95)]">
                  <span className="h-3.5 w-3.5 rounded-full border border-cyan-100/70 bg-cyan-200/80 shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
                  <span className="pointer-events-none absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-white/80" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-100">URLs</p>
                  <p className="truncate text-[9px] text-cyan-100/55">Sticker de pantallas</p>
                </div>
                <button
                  type="button"
                  onClick={() => setScreenLinksOpen(false)}
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-cyan-400/40 text-sm text-cyan-100 transition hover:bg-cyan-500/10"
                  aria-label="Cerrar configuracion de pantallas"
                >
                  ?
                </button>
              </div>
              <div className="space-y-1.5">
                {screenUrlDrafts.map((url, index) => (
                  <label key={index} className="block space-y-0.5">
                    <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-cyan-200/90">
                      {index === 3 ? "3D" : `Pantalla ${index + 1}`}
                    </span>
                    <input
                      type="url"
                      value={url}
                      onChange={(event) => {
                        const value = event.target.value;
                        setScreenUrlDrafts((current) => {
                          const next = [...current] as LobbyScreenUrls;
                          next[index] = value;
                          return next;
                        });
                      }}
                      placeholder={index === 3 ? "https://.../modelo.glb" : "https://"}
                      className="h-7 w-full rounded-lg border border-cyan-400/35 bg-black/40 px-2 text-[11px] text-cyan-50 outline-none transition placeholder:text-cyan-100/35 focus:border-cyan-300"
                    />
                  </label>
                ))}
              </div>
              <div className="mt-2 flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setScreenUrlDrafts(defaultLobbyScreenUrls());
                  }}
                  className="rounded-full border border-cyan-400/35 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-cyan-100 transition hover:bg-cyan-500/10"
                >
                  Restaurar
                </button>
                <button
                  type="button"
                  onClick={applyScreenLinks}
                  className="rounded-full border border-cyan-400/60 bg-cyan-500/15 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-cyan-50 transition hover:bg-cyan-500/25"
                >
                  Aplicar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {escapeBarVisible && focusedScreen === null && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 border-t border-cyan-300/20 bg-gradient-to-t from-black/92 via-black/78 to-black/35 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-18px_48px_-24px_rgba(34,211,238,0.45)] backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-2 px-4 sm:flex-row sm:justify-between sm:gap-6">
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.95)]" aria-hidden />
              <p className="text-sm font-semibold tracking-wide text-white">Pearl Room</p>
            </div>
            <p className="text-center text-xs text-white/70 sm:flex-1 sm:text-sm">
              {isMobileTouch ? (
                <>
                  Arrastra con el dedo para mirar ? toca la escena para usar el rat?n ? pad izquierdo para moverte
                </>
              ) : (
                <>
                  Pulsa <span className="font-mono text-cyan-100/90">ESC</span> otra vez para ocultar esta barra y
                  seguir movi?ndote ? <span className="font-mono text-cyan-100/90">WASD</span> mover ? rat?n mirar
                </>
              )}
            </p>
            <p className="hidden text-[11px] uppercase tracking-[0.24em] text-cyan-200/55 sm:block">
              Controles en pausa
            </p>
          </div>
        </div>
      )}

      {locked && focusedScreen === null && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80 mix-blend-difference" />
      )}
    </div>
  );
}
