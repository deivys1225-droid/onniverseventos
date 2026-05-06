import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Billboard, DeviceOrientationControls, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import {
  getRoomMode,
  type MiMundoEnvironmentId,
} from "@/data/miMundoEnvironments";
import {
  MAX_WEBGL_PIXEL_RATIO,
  VR_STEREO_PIXEL_RATIO,
  applyPixelRatioCap,
  getAdaptiveSphereSegments,
  isMobileCoarseDevice,
} from "@/lib/webglRendererPrefs";
import { MessageCircleMore, UsersRound } from "lucide-react";
import { useVrModeActive } from "@/hooks/useVrModeActive";
import ProfileCard, { type ProfileCardConfirmPayload } from "@/components/ProfileCard";
import LiveRequestCard, { type LiveRequestPayload } from "@/components/LiveRequestCard";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { createLiveRequest, uploadLiveEventImage } from "@/lib/liveRequests";
import SocialMenu from "@/components/SocialMenu";
import ChatWindow from "@/components/ChatWindow";
import { supabase } from "@/integrations/supabase/client";
import FriendPicker, { type FriendCandidate } from "@/components/FriendPicker";
import SearchHub from "@/components/SearchHub";
import StreamSetupCard, { type StreamSetupPayload } from "@/components/StreamSetupCard";
import { startActiveStream, stopMyActiveStream } from "@/lib/activeStreams";

/** Texturas Tierra alta resolucion (three.js, estilo vista espacial tipo Artemis); radio sin cambios. */
const PLANETS = "https://cdn.jsdelivr.net/gh/mrdoob/three.js@dev/examples/textures/planets";
const EARTH_DAY_4K = `${PLANETS}/earth_day_4096.jpg`;
const EARTH_NORMAL = `${PLANETS}/earth_normal_2048.jpg`;
const EARTH_SPECULAR = `${PLANETS}/earth_specular_2048.jpg`;
const EARTH_CLOUDS = `${PLANETS}/earth_clouds_1024.png`;

/** Tierra y luna al 50% del tamano anterior. */
const CENTRAL_SPHERE_RADIUS = 0.925;

const GALAXY_PANORAMA_URL =
  "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=7680&q=90";

/** Luna: textura ligera + parametros de orbita. */
const MOON_TEXTURE_URL = `${PLANETS}/moon_1024.jpg`;
const MOON_RADIUS = CENTRAL_SPHERE_RADIUS * 0.27;
const MOON_ORBIT_RADIUS = CENTRAL_SPHERE_RADIUS * 1.95;
const MOON_ORBIT_SPEED = 0.22;
const EARTH_ROTATION_SPEED = 0.08;
const WINDOWS11_DESKTOP_URL =
  "https://images.unsplash.com/photo-1633419461186-7d40a38105ec?auto=format&fit=crop&w=1600&q=80";
const MI_MUNDO_CAMERA_VIEW_STORAGE_KEY = "onniverso.mi_mundo.camera_view";
const PROFILE_NAME_STORAGE_KEY = "onniverso.profile.name";

function readStoredProfileName(): string | undefined {
  try {
    const raw = localStorage.getItem(PROFILE_NAME_STORAGE_KEY)?.trim();
    return raw || undefined;
  } catch {
    return undefined;
  }
}
const DEFAULT_CAMERA_POSITION: [number, number, number] = [0, 0, 5.8];
const DEFAULT_ORBIT_TARGET: [number, number, number] = [0, 0, 0];

type StoredCameraView = {
  position: [number, number, number];
  target: [number, number, number];
};

function createVideoTexture(url: string) {
  if (typeof document === "undefined") return { video: null, texture: null as THREE.VideoTexture | null };
  const video = document.createElement("video");
  video.src = url;
  video.crossOrigin = "anonymous";
  video.loop = true;
  video.muted = true;
  video.autoplay = true;
  video.playsInline = true;
  video.preload = "auto";
  const texture = new THREE.VideoTexture(video);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return { video, texture };
}

function readStoredCameraView(): StoredCameraView | null {
  try {
    const raw = localStorage.getItem(MI_MUNDO_CAMERA_VIEW_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredCameraView>;
    if (
      !Array.isArray(parsed.position) ||
      parsed.position.length !== 3 ||
      !Array.isArray(parsed.target) ||
      parsed.target.length !== 3
    ) {
      return null;
    }
    const nums = [...parsed.position, ...parsed.target];
    if (!nums.every((value) => Number.isFinite(value))) return null;
    return {
      position: parsed.position as [number, number, number],
      target: parsed.target as [number, number, number],
    };
  } catch {
    return null;
  }
}

function MoonScreenCluster({
  visible,
  vrMirrorFlat,
  onOpenLiveRequest,
  onOpenStreamSetup,
  onCollapseScreens,
}: {
  visible: boolean;
  /** Mismo canvas 2D: planos que miran a la cámara, sin profundidad de escena. */
  vrMirrorFlat: boolean;
  onOpenLiveRequest?: () => void;
  onOpenStreamSetup?: () => void;
  onCollapseScreens?: () => void;
}) {
  const clusterRef = useRef<THREE.Group>(null);
  const [focusedScreen, setFocusedScreen] = useState<"social" | "video" | "live" | "system" | null>(null);
  const systemTexture = useLoader(THREE.TextureLoader, WINDOWS11_DESKTOP_URL);
  const liveCardTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bg.addColorStop(0, "#090909");
    bg.addColorStop(0.55, "#121015");
    bg.addColorStop(1, "#08080a");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const cyanAura = ctx.createRadialGradient(1030, 180, 25, 1030, 180, 380);
    cyanAura.addColorStop(0, "rgba(255,204,120,0.28)");
    cyanAura.addColorStop(1, "rgba(255,204,120,0)");
    ctx.fillStyle = cyanAura;
    ctx.fillRect(660, 0, 640, 560);
    const goldAura = ctx.createRadialGradient(220, 540, 20, 220, 540, 320);
    goldAura.addColorStop(0, "rgba(255,195,76,0.26)");
    goldAura.addColorStop(1, "rgba(255,195,76,0)");
    ctx.fillStyle = goldAura;
    ctx.fillRect(0, 330, 540, 390);

    ctx.strokeStyle = "rgba(255,205,126,0.68)";
    ctx.lineWidth = 7;
    ctx.strokeRect(34, 34, canvas.width - 68, canvas.height - 68);
    ctx.strokeStyle = "rgba(255,193,94,0.48)";
    ctx.lineWidth = 2;
    ctx.strokeRect(50, 50, canvas.width - 100, canvas.height - 100);

    ctx.fillStyle = "rgba(255,198,104,0.16)";
    ctx.fillRect(74, 62, 294, 56);
    ctx.strokeStyle = "rgba(255,209,132,0.6)";
    ctx.lineWidth = 2;
    ctx.strokeRect(74, 62, 294, 56);
    ctx.fillStyle = "#ffe5b0";
    ctx.font = "700 27px Arial";
    ctx.fillText("ONNIVERSO VIP", 90, 99);

    // Main title
    ctx.shadowColor = "rgba(104, 235, 255, 0.85)";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "#ffd28a";
    ctx.font = "800 56px Arial";
    ctx.fillText("REVOLUCION VIP:", 86, 172);
    ctx.fillStyle = "#fff4de";
    ctx.font = "800 58px Arial";
    ctx.fillText("MONETIZA SIN FRONTERAS", 86, 238);
    ctx.shadowBlur = 0;

    // Long-form copy with manual wrapping
    const copy =
      "Lidera la Nueva Era: Se el primero en llevar a tus artistas a una experiencia inmersiva unica en el Onniverso. Activa tu Estadio Virtual 360° y accede a una infraestructura exclusiva donde puedes vender Tickets VIP globales sin limites de aforo. Convierte cada show en un evento mundial, con la seguridad y el alcance que solo la tecnologia VR de vanguardia puede ofrecer. Tu artista, tu estadio, tus reglas.";
    const maxWidth = 730;
    const startX = 86;
    let y = 286;
    ctx.fillStyle = "rgba(234,248,255,0.97)";
    ctx.font = "500 24px Arial";
    const words = copy.split(" ");
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth) {
        ctx.fillText(line, startX, y);
        line = word;
        y += 34;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, startX, y);

    // VR visor illustration
    ctx.fillStyle = "rgba(20, 16, 10, 0.96)";
    ctx.strokeStyle = "rgba(255, 216, 140, 0.82)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(846, 228, 330, 164, 40);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255, 206, 120, 0.18)";
    ctx.beginPath();
    ctx.roundRect(872, 258, 278, 104, 28);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 226, 158, 0.92)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(940, 310, 34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(1082, 310, 34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,220,150,0.42)";
    ctx.fillRect(1001, 274, 18, 72);
    ctx.fillStyle = "rgba(255, 210, 120, 0.3)";
    ctx.fillRect(980, 206, 58, 30);

    // Premium trust tags
    ctx.fillStyle = "rgba(255,201,118,0.22)";
    ctx.fillRect(888, 430, 276, 50);
    ctx.strokeStyle = "rgba(255,219,156,0.72)";
    ctx.lineWidth = 2;
    ctx.strokeRect(888, 430, 276, 50);
    ctx.fillStyle = "#ffe8bf";
    ctx.font = "700 22px Arial";
    ctx.fillText("AFORO VIP GLOBAL", 940, 462);
    ctx.fillStyle = "rgba(95,230,255,0.18)";
    ctx.fillRect(888, 490, 276, 50);
    ctx.strokeStyle = "rgba(126,241,255,0.7)";
    ctx.strokeRect(888, 490, 276, 50);
    ctx.fillStyle = "#d6fbff";
    ctx.fillText("PAGOS VIP SEGUROS", 940, 522);

    // CTA focal button
    const btnW = 620;
    const btnH = 92;
    const btnX = 92;
    const btnY = 596;
    const ctaGlow = ctx.createRadialGradient(btnX + btnW / 2, btnY + btnH / 2, 30, btnX + btnW / 2, btnY + btnH / 2, 300);
    ctaGlow.addColorStop(0, "rgba(255,206,126,0.4)");
    ctaGlow.addColorStop(1, "rgba(0,245,255,0)");
    ctx.fillStyle = ctaGlow;
    ctx.fillRect(btnX - 90, btnY - 60, btnW + 180, btnH + 120);
    const btnGradient = ctx.createLinearGradient(btnX, btnY, btnX + btnW, btnY + btnH);
    btnGradient.addColorStop(0, "rgba(220,160,70,0.62)");
    btnGradient.addColorStop(1, "rgba(155,105,35,0.54)");
    ctx.fillStyle = btnGradient;
    ctx.fillRect(btnX, btnY, btnW, btnH);
    ctx.strokeStyle = "rgba(255, 230, 178, 0.98)";
    ctx.lineWidth = 5.5;
    ctx.strokeRect(btnX, btnY, btnW, btnH);
    ctx.fillStyle = "#fff8e8";
    ctx.font = "900 42px Arial";
    ctx.fillText("INSCRIBIR ARTISTA", btnX + 108, btnY + 60);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    return texture;
  }, []);

  const socialTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bg.addColorStop(0, "rgba(18,34,55,0.95)");
    bg.addColorStop(1, "rgba(9,18,30,0.95)");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(168, 232, 255, 0.6)";
    ctx.lineWidth = 5;
    ctx.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);

    ctx.fillStyle = "rgba(210, 244, 255, 0.22)";
    ctx.fillRect(28, 32, canvas.width - 56, 68);

    ctx.font = "700 44px Arial";
    ctx.fillStyle = "#dbf4ff";
    ctx.fillText("SOCIAL GLASS", 44, 78);

    const items = [
      {
        label: "Facebook",
        color: "#1877f2",
        x: 70,
        y: 150,
        iconUrl: "https://cdn.simpleicons.org/facebook/ffffff",
      },
      {
        label: "WhatsApp",
        color: "#25D366",
        x: 350,
        y: 150,
        iconUrl: "https://cdn.simpleicons.org/whatsapp/ffffff",
      },
      {
        label: "Instagram",
        color: "#E4405F",
        x: 630,
        y: 150,
        iconUrl: "https://cdn.simpleicons.org/instagram/ffffff",
      },
      {
        label: "Spotify",
        color: "#1ED760",
        x: 210,
        y: 296,
        iconUrl: "https://cdn.simpleicons.org/spotify/ffffff",
      },
      {
        label: "TikTok",
        color: "#00f2ea",
        x: 490,
        y: 296,
        iconUrl: "https://cdn.simpleicons.org/tiktok/ffffff",
      },
    ];

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    const drawItem = (item: (typeof items)[number]) => {
      ctx.fillStyle = "rgba(240, 250, 255, 0.14)";
      ctx.beginPath();
      ctx.roundRect(item.x, item.y, 250, 110, 22);
      ctx.fill();
      ctx.strokeStyle = `${item.color}cc`;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = item.color;
      ctx.font = "700 28px Arial";
      ctx.fillText(item.label, item.x + 82, item.y + 66);
    };

    items.forEach(drawItem);

    // Cargar iconos oficiales y pintar encima de cada tarjeta.
    items.forEach((item) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        ctx.fillStyle = `${item.color}cc`;
        ctx.beginPath();
        ctx.roundRect(item.x + 16, item.y + 16, 50, 50, 12);
        ctx.fill();
        ctx.drawImage(img, item.x + 25, item.y + 25, 32, 32);
        texture.needsUpdate = true;
      };
      img.src = item.iconUrl;
    });

    return texture;
  }, []);

  const infoTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bg.addColorStop(0, "rgba(13,26,44,0.96)");
    bg.addColorStop(1, "rgba(9,16,28,0.96)");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(122,228,255,0.72)";
    ctx.lineWidth = 4;
    ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);
    ctx.fillStyle = "#dff8ff";
    ctx.font = "700 52px Arial";
    ctx.fillText("ONNIVERSO", 62, 108);
    ctx.font = "700 40px Arial";
    ctx.fillText("PANTALLA DISPONIBLE", 62, 170);
    ctx.fillStyle = "rgba(200,236,255,0.9)";
    ctx.font = "500 30px Arial";
    ctx.fillText("Este espacio se reserva para nuevos contenidos", 62, 248);
    ctx.fillText("inmersivos y experiencias en vivo.", 62, 292);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }, []);

  useEffect(() => {
    systemTexture.colorSpace = THREE.SRGBColorSpace;
    systemTexture.anisotropy = 8;
    if (liveCardTexture) {
      liveCardTexture.anisotropy = 8;
      liveCardTexture.needsUpdate = true;
    }
    if (infoTexture) {
      infoTexture.anisotropy = 8;
      infoTexture.needsUpdate = true;
    }
  }, [infoTexture, liveCardTexture, systemTexture]);

  useEffect(() => {
    return () => {
      socialTexture?.dispose();
      systemTexture?.dispose();
      liveCardTexture?.dispose();
      infoTexture?.dispose();
    };
  }, [infoTexture, liveCardTexture, socialTexture, systemTexture]);

  useFrame((_, delta) => {
    if (!clusterRef.current) return;
    const target = visible ? 1 : 0;
    const scale = THREE.MathUtils.damp(clusterRef.current.scale.x, target, 9, delta);
    clusterRef.current.scale.setScalar(scale);
  });

  const enableAudioFor = (video: HTMLVideoElement | null) => {
    if (!video) return;
    video.muted = false;
    video.defaultMuted = false;
    video.removeAttribute("muted");
    video.volume = 1;
    void video.play().catch(() => undefined);
  };

  if (vrMirrorFlat) {
    const scaleFor = (id: "social" | "video" | "live" | "system") => (focusedScreen === id ? 1.16 : focusedScreen ? 0.9 : 1);
    const boostFor = (id: "social" | "video" | "live" | "system") => (focusedScreen === id ? 0.6 : 0);
    const opacityFor = (id: "social" | "video" | "live" | "system") => (focusedScreen && focusedScreen !== id ? 0.45 : 1);
    return (
      <group ref={clusterRef}>
        <Billboard position={[0, 0.18, 1.35 + boostFor("social")]} follow scale={scaleFor("social")}>
          <mesh
            renderOrder={focusedScreen === "social" ? 25 : 6}
            onPointerDown={(event) => {
              event.stopPropagation();
              setFocusedScreen("social");
            }}
            onDoubleClick={(event) => {
              event.stopPropagation();
              onCollapseScreens?.();
            }}
          >
            <planeGeometry args={[2.9, 1.72]} />
            <meshBasicMaterial
              map={socialTexture ?? undefined}
              toneMapped={false}
              side={THREE.DoubleSide}
              transparent
              opacity={opacityFor("social")}
            />
          </mesh>
        </Billboard>
        <Billboard position={[0, 0.18, -1.35 - boostFor("video")]} follow scale={scaleFor("video")}>
          <mesh
            renderOrder={focusedScreen === "video" ? 25 : 6}
            onPointerDown={(event) => {
              event.stopPropagation();
              setFocusedScreen("video");
            }}
            onDoubleClick={(event) => {
              event.stopPropagation();
              onCollapseScreens?.();
            }}
          >
            <planeGeometry args={[2.9, 1.72]} />
            <meshBasicMaterial
              map={infoTexture ?? undefined}
              toneMapped={false}
              side={THREE.DoubleSide}
              transparent
              opacity={opacityFor("video")}
            />
          </mesh>
        </Billboard>
        <Billboard position={[-1.35 - boostFor("live"), 0.18, 0]} follow scale={scaleFor("live")}>
          <mesh
            renderOrder={focusedScreen === "live" ? 25 : 6}
            onPointerDown={(event) => {
              event.stopPropagation();
              setFocusedScreen("live");
              onOpenLiveRequest?.();
            }}
            onDoubleClick={(event) => {
              event.stopPropagation();
              onCollapseScreens?.();
            }}
          >
            <planeGeometry args={[2.9, 1.72]} />
            <meshBasicMaterial
              map={liveCardTexture ?? undefined}
              toneMapped={false}
              side={THREE.DoubleSide}
              transparent
              opacity={opacityFor("live")}
            />
          </mesh>
        </Billboard>
        <Billboard position={[1.35 + boostFor("system"), 0.18, 0]} follow scale={scaleFor("system")}>
          <mesh
            renderOrder={focusedScreen === "system" ? 25 : 6}
            onPointerDown={(event) => {
              event.stopPropagation();
              setFocusedScreen("system");
              onOpenStreamSetup?.();
            }}
            onDoubleClick={(event) => {
              event.stopPropagation();
              onCollapseScreens?.();
            }}
          >
            <planeGeometry args={[3, 1.8]} />
            <meshBasicMaterial
              map={systemTexture ?? undefined}
              toneMapped={false}
              side={THREE.DoubleSide}
              transparent
              opacity={opacityFor("system")}
            />
          </mesh>
        </Billboard>
      </group>
    );
  }

  const scaleFor = (id: "social" | "video" | "live" | "system") => (focusedScreen === id ? 1.16 : focusedScreen ? 0.9 : 1);
  const offsetFor = (id: "social" | "video" | "live" | "system") => (focusedScreen === id ? 0.58 : 0);
  const opacityFor = (id: "social" | "video" | "live" | "system") => (focusedScreen && focusedScreen !== id ? 0.45 : 1);

  return (
    <group ref={clusterRef}>
      <mesh
        position={[0, 0.18, 1.35 + offsetFor("social")]}
        renderOrder={focusedScreen === "social" ? 25 : 6}
        scale={scaleFor("social")}
        onPointerDown={(event) => {
          event.stopPropagation();
          setFocusedScreen("social");
        }}
        onDoubleClick={(event) => {
          event.stopPropagation();
          onCollapseScreens?.();
        }}
      >
        <planeGeometry args={[2.9, 1.72]} />
        <meshBasicMaterial
          map={socialTexture ?? undefined}
          toneMapped={false}
          side={THREE.DoubleSide}
          transparent
          opacity={opacityFor("social")}
        />
      </mesh>
      <mesh
        position={[0, 0.18, -1.35 - offsetFor("video")]}
        rotation={[0, Math.PI, 0]}
        renderOrder={focusedScreen === "video" ? 25 : 6}
        scale={scaleFor("video")}
        onPointerDown={(event) => {
          event.stopPropagation();
          setFocusedScreen("video");
        }}
        onDoubleClick={(event) => {
          event.stopPropagation();
          onCollapseScreens?.();
        }}
      >
        <planeGeometry args={[2.9, 1.72]} />
        <meshBasicMaterial
          map={infoTexture ?? undefined}
          toneMapped={false}
          side={THREE.DoubleSide}
          transparent
          opacity={opacityFor("video")}
        />
      </mesh>
      <mesh
        position={[-1.35 - offsetFor("live"), 0.18, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        renderOrder={focusedScreen === "live" ? 25 : 6}
        scale={scaleFor("live")}
        onPointerDown={(event) => {
          event.stopPropagation();
          setFocusedScreen("live");
          onOpenLiveRequest?.();
        }}
        onDoubleClick={(event) => {
          event.stopPropagation();
          onCollapseScreens?.();
        }}
      >
        <planeGeometry args={[2.9, 1.72]} />
        <meshBasicMaterial
          map={liveCardTexture ?? undefined}
          toneMapped={false}
          side={THREE.DoubleSide}
          transparent
          opacity={opacityFor("live")}
        />
      </mesh>
      <mesh
        position={[1.35 + offsetFor("system"), 0.18, 0]}
        rotation={[0, Math.PI / 2, 0]}
        renderOrder={focusedScreen === "system" ? 25 : 6}
        scale={scaleFor("system")}
        onPointerDown={(event) => {
          event.stopPropagation();
          setFocusedScreen("system");
          onOpenStreamSetup?.();
        }}
        onDoubleClick={(event) => {
          event.stopPropagation();
          onCollapseScreens?.();
        }}
      >
        <planeGeometry args={[3, 1.8]} />
        <meshBasicMaterial
          map={systemTexture ?? undefined}
          toneMapped={false}
          side={THREE.DoubleSide}
          transparent
          opacity={opacityFor("system")}
        />
      </mesh>
    </group>
  );
}

function OrbitingMoon({
  moonRef,
  simpleGpu,
  vrStereo,
  onSelect,
}: {
  moonRef: React.RefObject<THREE.Mesh>;
  simpleGpu: boolean;
  vrStereo: boolean;
  onSelect?: () => void;
}) {
  const pivotRef = useRef<THREE.Group>(null);
  const moonTexture = useLoader(THREE.TextureLoader, MOON_TEXTURE_URL);

  const moonSeg = useMemo(() => getAdaptiveSphereSegments(vrStereo), [vrStereo]);

  useEffect(() => {
    moonTexture.colorSpace = THREE.SRGBColorSpace;
    moonTexture.anisotropy = vrStereo ? 1 : simpleGpu ? 2 : 8;
  }, [moonTexture, simpleGpu, vrStereo]);

  useFrame((_, delta) => {
    if (pivotRef.current) {
      pivotRef.current.rotation.y += delta * MOON_ORBIT_SPEED;
    }
  });

  return (
    <group ref={pivotRef} rotation={[0.18, 0, 0]}>
      <mesh
        ref={moonRef}
        position={[MOON_ORBIT_RADIUS, -1.24, 0]}
        key={`moon-${moonSeg}`}
        onPointerDown={(event) => {
          event.stopPropagation();
          onSelect?.();
        }}
      >
        <sphereGeometry args={[MOON_RADIUS, moonSeg, moonSeg]} />
        <meshBasicMaterial map={moonTexture} toneMapped transparent opacity={1} />
      </mesh>
    </group>
  );
}

/**
 * Panorama 360°: una sola esfera gigante en el origen (cara interior, textura equirectangular).
 * La cámara orbita cerca del origen (~12 u max); cuanto mayor el radio, menor parallax y menos sensación de “en la cara”.
 * Valores subidos respecto al inicio (~360 u); ajusta aquí si quieres aún más lejanía.
 */
const PANORAMA_INTERIOR_RADIUS_STANDARD = 1400;

/** Estadio + escenas 1–4 y 6 (+20 % radio); la escena 5 solo estándar. */
const EXTRA_DEPTH_PANORAMA_SRC = new Set<string>([
  "/estadio.jpg",
  "/1.jpeg",
  "/2.jpeg",
  "/3.jpeg",
  "/4.jpeg",
  "/6.jpeg",
]);

function panoramaInteriorRadius(roomTextureUrl: string): number {
  return EXTRA_DEPTH_PANORAMA_SRC.has(roomTextureUrl)
    ? PANORAMA_INTERIOR_RADIUS_STANDARD * 1.2
    : PANORAMA_INTERIOR_RADIUS_STANDARD;
}

function SpaceBackground({
  roomTextureUrl,
  vrStereo,
  simpleGpu,
}: {
  roomTextureUrl: string;
  vrStereo: boolean;
  simpleGpu: boolean;
}) {
  const [map, setMap] = useState<THREE.Texture | null>(null);
  const textureRef = useRef<THREE.Texture | null>(null);

  const sphereRadius = useMemo(() => panoramaInteriorRadius(roomTextureUrl), [roomTextureUrl]);
  const sphereSegments = vrStereo ? 32 : simpleGpu ? 40 : 48;

  useEffect(() => {
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.load(roomTextureUrl, (texture) => {
      if (cancelled) {
        texture.dispose();
        return;
      }
      if (textureRef.current) textureRef.current.dispose();
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.mapping = THREE.EquirectangularReflectionMapping;
      texture.anisotropy = vrStereo ? 1 : 8;
      textureRef.current = texture;
      setMap(texture);
    });
    return () => {
      cancelled = true;
      setMap(null);
      if (textureRef.current) {
        textureRef.current.dispose();
        textureRef.current = null;
      }
    };
  }, [roomTextureUrl]);

  useEffect(() => {
    const t = textureRef.current;
    if (t) {
      t.anisotropy = vrStereo ? 1 : 8;
      t.needsUpdate = true;
    }
  }, [vrStereo]);

  if (!map) return null;

  return (
    <mesh key={`panorama-${sphereRadius}-${roomTextureUrl}`} frustumCulled={false} renderOrder={-2000}>
      <sphereGeometry args={[sphereRadius, sphereSegments, sphereSegments]} />
      <meshBasicMaterial map={map} side={THREE.BackSide} depthWrite={false} toneMapped={!vrStereo} />
    </mesh>
  );
}

/**
 * Invierte canal de brillo Phong (oceano claro = mas brillante) a roughness PBR (oscuro = menos rugoso).
 */
function specularToRoughnessTexture(specular: THREE.Texture): THREE.CanvasTexture {
  const img = specular.image as HTMLImageElement;
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < data.data.length; i += 4) {
    const g = data.data[i] / 255;
    const rough = 0.22 + (1 - g) * 0.78;
    const v = Math.round(rough * 255);
    data.data[i] = data.data[i + 1] = data.data[i + 2] = v;
  }
  ctx.putImageData(data, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

/** Planeta Tierra central: texturas/material; posicion, radio y orbita intactos. */
function CentralEarth({
  simpleGpu,
  vrStereo,
  onSelect,
}: {
  simpleGpu: boolean;
  vrStereo: boolean;
  onSelect?: () => void;
}) {
  const earthRef = useRef<THREE.Group>(null);
  const [dayMap, normalMap, specularMap, cloudsMap] = useLoader(THREE.TextureLoader, [
    EARTH_DAY_4K,
    EARTH_NORMAL,
    EARTH_SPECULAR,
    EARTH_CLOUDS,
  ]);

  const roughnessMap = useMemo(
    () => (simpleGpu ? null : specularToRoughnessTexture(specularMap)),
    [specularMap, simpleGpu],
  );

  useEffect(() => {
    return () => roughnessMap?.dispose();
  }, [roughnessMap]);

  useEffect(() => {
    const antisoBase = vrStereo ? 2 : simpleGpu ? 4 : 16;
    const antisoCloud = vrStereo ? 1 : simpleGpu ? 2 : 12;
    dayMap.colorSpace = THREE.SRGBColorSpace;
    dayMap.anisotropy = antisoBase;
    dayMap.minFilter = THREE.LinearMipmapLinearFilter;
    dayMap.magFilter = THREE.LinearFilter;
    normalMap.colorSpace = THREE.NoColorSpace;
    normalMap.anisotropy = antisoBase;
    specularMap.colorSpace = THREE.NoColorSpace;
    cloudsMap.colorSpace = THREE.SRGBColorSpace;
    cloudsMap.anisotropy = antisoCloud;
  }, [dayMap, normalMap, specularMap, cloudsMap, simpleGpu, vrStereo]);

  useFrame((_, delta) => {
    if (earthRef.current) {
      earthRef.current.rotation.y += delta * EARTH_ROTATION_SPEED;
    }
  });

  const seg = useMemo(() => getAdaptiveSphereSegments(vrStereo), [vrStereo]);

  if (simpleGpu) {
    return (
      <group ref={earthRef} key={`earth-s-${seg}`}>
        <mesh
          renderOrder={0}
          onPointerDown={(event) => {
            event.stopPropagation();
            onSelect?.();
          }}
        >
          <sphereGeometry args={[CENTRAL_SPHERE_RADIUS, seg, seg]} />
          <meshBasicMaterial map={dayMap} toneMapped />
        </mesh>
        <mesh renderOrder={1} scale={1.0018}>
          <sphereGeometry args={[CENTRAL_SPHERE_RADIUS, seg, seg]} />
          <meshBasicMaterial map={cloudsMap} transparent opacity={0.92} depthWrite={false} toneMapped />
        </mesh>
        <mesh renderOrder={2} scale={1.024}>
          <sphereGeometry args={[CENTRAL_SPHERE_RADIUS, seg, seg]} />
          <meshBasicMaterial
            color="#6ab4ff"
            transparent
            opacity={0.085}
            depthWrite={false}
            side={THREE.FrontSide}
            blending={THREE.NormalBlending}
          />
        </mesh>
      </group>
    );
  }

  return (
    <group ref={earthRef} key={`earth-hd-${seg}`}>
      <mesh
        renderOrder={0}
        onPointerDown={(event) => {
          event.stopPropagation();
          onSelect?.();
        }}
      >
        <sphereGeometry args={[CENTRAL_SPHERE_RADIUS, seg, seg]} />
        <meshStandardMaterial
          map={dayMap}
          normalMap={normalMap}
          normalScale={new THREE.Vector2(0.045, 0.045)}
          roughnessMap={roughnessMap ?? undefined}
          roughness={1}
          metalness={0.06}
          envMapIntensity={0}
          toneMapped
        />
      </mesh>
      <mesh renderOrder={1} scale={1.0018}>
        <sphereGeometry args={[CENTRAL_SPHERE_RADIUS, seg, seg]} />
        <meshStandardMaterial
          map={cloudsMap}
          transparent
          opacity={0.92}
          depthWrite={false}
          roughness={1}
          metalness={0}
          envMapIntensity={0}
          toneMapped
        />
      </mesh>
      <mesh renderOrder={2} scale={1.024}>
        <sphereGeometry args={[CENTRAL_SPHERE_RADIUS, seg, seg]} />
        <meshBasicMaterial
          color="#6ab4ff"
          transparent
          opacity={0.085}
          depthWrite={false}
          side={THREE.FrontSide}
          blending={THREE.NormalBlending}
        />
      </mesh>
    </group>
  );
}

function DeviceGyroController({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;
  return <DeviceOrientationControls />;
}

/** Stereo VR / capture mode: DPR 1, sin tone mapping tipo ACES (menos trabajo por frame). */
function VrStereoPerfSync({ active }: { active: boolean }) {
  const { gl, invalidate } = useThree();
  const savedTone = useRef<{ tm: THREE.ToneMapping; exp: number } | null>(null);

  useEffect(() => {
    if (active) {
      savedTone.current = { tm: gl.toneMapping, exp: gl.toneMappingExposure };
      gl.setPixelRatio(VR_STEREO_PIXEL_RATIO);
      gl.toneMapping = THREE.NoToneMapping;
      gl.toneMappingExposure = 1;
      gl.shadowMap.enabled = false;
    } else {
      if (savedTone.current) {
        gl.toneMapping = savedTone.current.tm;
        gl.toneMappingExposure = savedTone.current.exp;
      } else {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 0.96;
      }
      applyPixelRatioCap(gl);
      gl.shadowMap.enabled = false;
    }
    invalidate();
  }, [active, gl, invalidate]);

  return null;
}

export type MiMundoVRSectionProps = {
  profileDisplayName?: string | null;
  profileAvatarUrl?: string | null;
  onProfilePersist?: (payload: ProfileCardConfirmPayload) => void | Promise<void>;
};

const MiMundoVRSection = ({
  profileDisplayName,
  profileAvatarUrl,
  onProfilePersist,
}: MiMundoVRSectionProps) => {
  const { user } = useAuth();
  const [gyroEnabled, setGyroEnabled] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [moonScreensVisible, setMoonScreensVisible] = useState(false);
  const [liveRequestOpen, setLiveRequestOpen] = useState(false);
  const [liveRequestSaving, setLiveRequestSaving] = useState(false);
  const [streamSetupOpen, setStreamSetupOpen] = useState(false);
  const [streamSaving, setStreamSaving] = useState(false);
  const [isUserLive, setIsUserLive] = useState(false);
  const [socialMenuOpen, setSocialMenuOpen] = useState(false);
  const [activeChat, setActiveChat] = useState<{ friendshipId: string; friendName: string } | null>(null);
  const [friendCandidates, setFriendCandidates] = useState<FriendCandidate[]>([]);
  const [friendPickerOpen, setFriendPickerOpen] = useState(false);
  const panoramaUrl = GALAXY_PANORAMA_URL;
  const vrStereoActive = useVrModeActive();
  const moonRef = useRef<THREE.Mesh>(null);
  const environmentId = useMemo<MiMundoEnvironmentId>(() => "lobby", []);
  const storedCameraView = useMemo(
    () => (typeof window === "undefined" ? null : readStoredCameraView()),
    [],
  );
  const storedProfileName = useMemo(
    () => (typeof window === "undefined" ? undefined : readStoredProfileName()),
    [],
  );

  const cardDisplayName =
    profileDisplayName?.trim() || storedProfileName || "Explorador VR";
  const cardAvatarSrc = profileAvatarUrl?.trim() || "/placeholder.svg";

  const roomMode = useMemo(() => getRoomMode(environmentId), [environmentId]);

  const isMobileCoarse = useMemo(() => isMobileCoarseDevice(), []);
  const cameraPosition = storedCameraView?.position ?? DEFAULT_CAMERA_POSITION;
  const orbitTarget = storedCameraView?.target ?? DEFAULT_ORBIT_TARGET;

  const onProfileConfirm = async (payload: ProfileCardConfirmPayload) => {
    try {
      localStorage.setItem(PROFILE_NAME_STORAGE_KEY, payload.name);
    } catch {
      /* ignore */
    }
    if (!onProfilePersist) return;
    setProfileSaving(true);
    try {
      await onProfilePersist(payload);
    } finally {
      setProfileSaving(false);
    }
  };

  const onLiveRequestSubmit = async (payload: LiveRequestPayload) => {
    if (!user) {
      toast.error("Debes iniciar sesion para enviar solicitud LIVE.");
      return;
    }
    setLiveRequestSaving(true);
    try {
      const eventImageUrl = await uploadLiveEventImage(user.id, payload.eventImageFile);
      await createLiveRequest({
        userId: user.id,
        requesterEmail: payload.email,
        artistName: payload.artistName,
        ticketPrice: payload.ticketPrice,
        stadiumDisplayName: payload.stadiumName,
        eventImageUrl,
      });
      toast.success("Solicitud LIVE enviada.");
      setLiveRequestOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo enviar la solicitud LIVE.");
    } finally {
      setLiveRequestSaving(false);
    }
  };

  const onAddFriendFromProfile = async () => {
    setFriendPickerOpen(true);
  };

  const sendFriendRequest = async (candidate: FriendCandidate) => {
    if (!user) {
      toast.error("Debes iniciar sesion para enviar solicitudes de amistad.");
      return;
    }
    if (candidate.id === user.id) {
      toast.error("No puedes enviarte una solicitud a ti mismo.");
      return;
    }
    const { error } = await supabase.rpc("send_friendship_request", { p_receiver_id: candidate.id });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Solicitud enviada a ${candidate.name}.`);
    setFriendPickerOpen(false);
  };

  useEffect(() => {
    if (!user) {
      setFriendCandidates([]);
      return;
    }
    const loadFriendCandidates = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id,full_name,avatar_url")
        .neq("id", user.id)
        .order("updated_at", { ascending: false })
        .limit(10);
      const rows = (data ?? []) as { id: string; full_name: string | null; avatar_url: string | null }[];
      setFriendCandidates(
        rows.map((row) => ({
          id: row.id,
          name: row.full_name?.trim() || "Usuario",
          avatarUrl: row.avatar_url,
        })),
      );
    };
    void loadFriendCandidates();
  }, [user]);

  useEffect(() => {
    if (!moonScreensVisible) setLiveRequestOpen(false);
  }, [moonScreensVisible]);
  useEffect(() => {
    if (!moonScreensVisible) setStreamSetupOpen(false);
  }, [moonScreensVisible]);
  useEffect(() => {
    if (!streamSetupOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setStreamSetupOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [streamSetupOpen]);

  const onOrbitEnd = (event: { target?: { object?: THREE.Camera; target?: THREE.Vector3 } }) => {
    if (typeof window === "undefined") return;
    const controlsTarget = event.target;
    if (!controlsTarget?.object || !controlsTarget?.target) return;
    const camera = controlsTarget.object;
    const target = controlsTarget.target;
    const payload: StoredCameraView = {
      position: [camera.position.x, camera.position.y, camera.position.z],
      target: [target.x, target.y, target.z],
    };
    localStorage.setItem(MI_MUNDO_CAMERA_VIEW_STORAGE_KEY, JSON.stringify(payload));
  };

  useEffect(() => {
    if (!user) {
      setIsUserLive(false);
      return;
    }
    const loadLive = async () => {
      const { data } = await supabase.from("active_streams").select("is_live").eq("user_id", user.id).maybeSingle();
      setIsUserLive(Boolean((data as { is_live?: boolean } | null)?.is_live));
    };
    void loadLive();
  }, [user]);

  const onStreamSubmit = async (payload: StreamSetupPayload) => {
    if (!user) {
      toast.error("Debes iniciar sesion para transmitir.");
      return;
    }
    setStreamSaving(true);
    try {
      await startActiveStream({
        userId: user.id,
        streamUrl: payload.streamUrl,
        title: payload.title,
        category: payload.category,
      });
      setIsUserLive(true);
      toast.success("Transmision activa en Onniverso.");
      setStreamSetupOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo iniciar el live.");
    } finally {
      setStreamSaving(false);
    }
  };

  const onStopStream = async () => {
    try {
      await stopMyActiveStream();
      setIsUserLive(false);
      toast.success("Transmision detenida.");
      setStreamSetupOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo detener el live.");
    }
  };

  const enableGyroscope = async () => {
    if (typeof window === "undefined") return;

    const maybeDeviceOrientation = window.DeviceOrientationEvent as
      | (typeof DeviceOrientationEvent & { requestPermission?: () => Promise<"granted" | "denied"> })
      | undefined;

    if (maybeDeviceOrientation?.requestPermission) {
      const permission = await maybeDeviceOrientation.requestPermission();
      if (permission !== "granted") return;
    }

    setGyroEnabled(true);
  };

  return (
    <section id="mi-mundo-vr" className="relative h-[100dvh] w-full overflow-hidden bg-black">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0">
        <Canvas
          dpr={vrStereoActive ? VR_STEREO_PIXEL_RATIO : [1, MAX_WEBGL_PIXEL_RATIO]}
          gl={{
            antialias: vrStereoActive ? false : !isMobileCoarse,
            alpha: false,
            powerPreference: "high-performance",
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 0.96,
          }}
          frameloop="always"
          onCreated={({ gl }) => {
            applyPixelRatioCap(gl);
          }}
          camera={{ position: cameraPosition, fov: 62, near: 0.1, far: 2000 }}
        >
          <color attach="background" args={roomMode === "equirect_interior" ? ["#0c0812"] : ["#02030a"]} />
          {/* VR espejo 2D: sin luces (solo meshBasic + fondo); evita sombras y shading */}
          {!vrStereoActive &&
            (isMobileCoarse ? (
              <ambientLight intensity={0.55} />
            ) : roomMode === "equirect_interior" ? (
              <>
                <hemisphereLight args={["#fce8f4", "#181018"]} intensity={0.52} />
                <ambientLight intensity={0.34} color="#fff8fc" />
                <directionalLight position={[5, 7, 4]} intensity={1.58} color="#fff5f8" />
                <directionalLight position={[-5, -7, -4]} intensity={1.1} color="#fff5f8" />
              </>
            ) : (
              <>
                <ambientLight intensity={0.36} />
                <directionalLight position={[6, 2.5, 2]} intensity={2.02} color="#eef3fb" />
                <directionalLight position={[-6, -2.5, -2]} intensity={1.18} color="#eef3fb" />
              </>
            ))}

          {/* Fondo: solo textura en scene.background (0 geometría de esfera). */}
          <Suspense fallback={null}>
            <SpaceBackground
              roomTextureUrl={panoramaUrl}
              vrStereo={vrStereoActive}
              simpleGpu={isMobileCoarse || vrStereoActive}
            />
          </Suspense>
          <Suspense fallback={null}>
            <CentralEarth
              simpleGpu={isMobileCoarse || vrStereoActive}
              vrStereo={vrStereoActive}
              onSelect={() => setMoonScreensVisible((prev) => !prev)}
            />
          </Suspense>
          <Suspense fallback={null}>
            <OrbitingMoon
              moonRef={moonRef}
              simpleGpu={isMobileCoarse || vrStereoActive}
              vrStereo={vrStereoActive}
              onSelect={() => setMoonScreensVisible((prev) => !prev)}
            />
          </Suspense>
          <Suspense fallback={null}>
            <MoonScreenCluster
              visible={moonScreensVisible}
              vrMirrorFlat={vrStereoActive}
              onOpenLiveRequest={() => setLiveRequestOpen((prev) => !prev)}
              onOpenStreamSetup={() => setStreamSetupOpen((prev) => !prev)}
              onCollapseScreens={() => setMoonScreensVisible(false)}
            />
          </Suspense>

          <OrbitControls
            makeDefault
            enabled={!vrStereoActive && !gyroEnabled}
            target={orbitTarget}
            enablePan={false}
            enableDamping
            dampingFactor={0.06}
            rotateSpeed={0.65}
            minDistance={3.2}
            maxDistance={12}
            minPolarAngle={0.02}
            maxPolarAngle={Math.PI - 0.02}
            onEnd={onOrbitEnd}
          />
          <DeviceGyroController enabled={!vrStereoActive && gyroEnabled} />
          <VrStereoPerfSync active={vrStereoActive} />
        </Canvas>
        </div>
      </div>
      {!vrStereoActive && moonScreensVisible && <SearchHub currentUserId={user?.id} />}

      {!vrStereoActive && !moonScreensVisible && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-4">
          <div className="pointer-events-auto origin-center scale-[0.63] -translate-y-[clamp(3.75rem,22vh,13rem)]">
            <ProfileCard
              initialName={cardDisplayName}
              initialAvatarSrc={cardAvatarSrc}
              isSaving={profileSaving}
              onConfirm={onProfileConfirm}
              showAddFriend={Boolean(user && friendCandidates.length > 0)}
              onAddFriend={onAddFriendFromProfile}
            />
          </div>
        </div>
      )}
      {user && (
        <FriendPicker
          open={friendPickerOpen}
          candidates={friendCandidates}
          onClose={() => setFriendPickerOpen(false)}
          onSelect={(candidate) => void sendFriendRequest(candidate)}
        />
      )}

      {!vrStereoActive && moonScreensVisible && liveRequestOpen && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-4">
          <div className="pointer-events-auto origin-center scale-[0.66] -translate-y-[clamp(3.75rem,22vh,13rem)]">
            <LiveRequestCard onSubmit={onLiveRequestSubmit} isSubmitting={liveRequestSaving} />
          </div>
        </div>
      )}
      {!vrStereoActive && moonScreensVisible && streamSetupOpen && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-end justify-end px-4 pb-16">
          <button
            type="button"
            aria-label="Cerrar transmitir"
            className="pointer-events-auto absolute inset-0"
            onClick={() => setStreamSetupOpen(false)}
          />
          <div className="pointer-events-auto">
            <StreamSetupCard
              isSubmitting={streamSaving}
              onSubmit={onStreamSubmit}
              onStopLive={onStopStream}
              isLive={isUserLive}
              onClose={() => setStreamSetupOpen(false)}
            />
          </div>
        </div>
      )}

      {!vrStereoActive && (
        <>
          <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-2 pb-[env(safe-area-inset-bottom,0px)] pr-[env(safe-area-inset-right,0px)]">
            <button
              type="button"
              onClick={() => setSocialMenuOpen((prev) => !prev)}
              aria-label={socialMenuOpen ? "Cerrar social" : "Abrir social"}
              aria-expanded={socialMenuOpen}
              className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-cyan-300/40 bg-cyan-500/10 text-cyan-200 shadow-[0_0_24px_-8px_rgba(34,211,238,0.75)] transition hover:bg-cyan-500/20"
            >
              <UsersRound className="h-5 w-5" />
            </button>
          </div>
          {user && (
            <SocialMenu
              userId={user.id}
              open={socialMenuOpen}
              onClose={() => setSocialMenuOpen(false)}
              onOpenChat={(friend) => {
                setActiveChat({ friendshipId: friend.friendshipId, friendName: friend.name });
                setSocialMenuOpen(false);
              }}
            />
          )}
          {user && activeChat && (
            <ChatWindow
              friendshipId={activeChat.friendshipId}
              currentUserId={user.id}
              friendName={activeChat.friendName}
              onClose={() => setActiveChat(null)}
            />
          )}
          {!user && socialMenuOpen && (
            <div className="pointer-events-auto fixed bottom-20 right-4 z-[70] rounded-xl border border-cyan-300/35 bg-card/90 px-3 py-2 text-xs text-cyan-100 backdrop-blur-xl">
              <MessageCircleMore className="mr-1 inline h-3.5 w-3.5" />
              Inicia sesion para usar Social.
            </div>
          )}
        </>
      )}

    </section>
  );
};

export default MiMundoVRSection;
