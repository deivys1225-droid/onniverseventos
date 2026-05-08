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
import StorePublishCard, { type StorePublishPayload } from "@/components/StorePublishCard";
import { createStoreItem, uploadStoreAsset } from "@/lib/storeItems";
import VaultCard from "@/components/VaultCard";
import { createLivepeerStreamViaEdge } from "@/lib/livepeerStudio";
import { livepeerPublicHlsUrl } from "@/lib/livepeerPlayback";
import { startActiveStream } from "@/lib/activeStreams";
import { updateProfileLiveState } from "@/lib/profile";
import { detectDeviceKind } from "@/lib/deviceDetection";
import { startNativeLiveStreaming } from "@/lib/liveStreamingNative";
import { Capacitor } from "@capacitor/core";

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
  onOpenVault,
  onOpenLiveRequest,
  onOpenStoreSetup,
  onCollapseScreens,
  isUserLive,
}: {
  visible: boolean;
  /** Mismo canvas 2D: planos que miran a la cámara, sin profundidad de escena. */
  vrMirrorFlat: boolean;
  onOpenVault?: () => void;
  onOpenLiveRequest?: () => void;
  onOpenStoreSetup?: (itemType: "biblioteca" | "cursos") => void;
  onCollapseScreens?: () => void;
  isUserLive?: boolean;
}) {
  const clusterRef = useRef<THREE.Group>(null);
  const systemTexture = useLoader(THREE.TextureLoader, WINDOWS11_DESKTOP_URL);
  const liveCardTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bg.addColorStop(0, "rgba(2,6,14,0.72)");
    bg.addColorStop(0.55, "rgba(5,10,22,0.65)");
    bg.addColorStop(1, "rgba(2,6,14,0.72)");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cyanAura = ctx.createRadialGradient(1010, 145, 40, 1010, 145, 360);
    cyanAura.addColorStop(0, "rgba(75,225,255,0.32)");
    cyanAura.addColorStop(1, "rgba(75,225,255,0)");
    ctx.fillStyle = cyanAura;
    ctx.fillRect(680, 0, 600, 420);

    ctx.strokeStyle = "rgba(70,228,255,0.96)";
    ctx.lineWidth = 5;
    ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);
    ctx.strokeStyle = "rgba(66,198,255,0.72)";
    ctx.lineWidth = 2;
    ctx.strokeRect(34, 34, canvas.width - 68, canvas.height - 68);

    const vipTagX = 66;
    const vipTagY = 52;
    const vipTagW = 320;
    const vipTagH = 58;
    const vipTagGrad = ctx.createLinearGradient(vipTagX, vipTagY, vipTagX + vipTagW, vipTagY + vipTagH);
    vipTagGrad.addColorStop(0, "rgba(20,42,66,0.78)");
    vipTagGrad.addColorStop(1, "rgba(10,26,46,0.78)");
    ctx.fillStyle = vipTagGrad;
    ctx.beginPath();
    ctx.roundRect(vipTagX, vipTagY, vipTagW, vipTagH, 20);
    ctx.fill();
    ctx.strokeStyle = "rgba(98,224,255,0.85)";
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,166,233,0.68)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(vipTagX + 5, vipTagY + 5, vipTagW - 10, vipTagH - 10, 16);
    ctx.stroke();
    ctx.fillStyle = "#ff9ce4";
    ctx.font = "800 30px 'Trebuchet MS'";
    ctx.fillText("ONNIVERSO VIP", 84, 91);

    ctx.shadowColor = "rgba(91, 228, 255, 0.82)";
    ctx.shadowBlur = 18;
    ctx.fillStyle = "#ff86d8";
    ctx.font = "900 62px 'Trebuchet MS'";
    ctx.fillText("REVOLUCION VIP", 78, 182);
    ctx.fillStyle = "#d5f7ff";
    ctx.font = "900 58px 'Trebuchet MS'";
    ctx.fillText("MONETIZA SIN FRONTERAS", 78, 246);
    ctx.shadowBlur = 0;

    const copy = "Activa tu estadio virtual 360 y vende Tickets VIP globales para tus artistas con infraestructura premium segura.";
    const words = copy.split(" ");
    let line = "";
    let y = 294;
    ctx.fillStyle = "rgba(226,246,255,0.96)";
    ctx.font = "600 26px 'Trebuchet MS'";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > 690) {
        ctx.fillText(line, 80, y);
        line = word;
        y += 34;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, 80, y);

    const photoX = 810;
    const photoY = 200;
    const photoW = 392;
    const photoH = 275;
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(photoX, photoY, photoW, photoH);
    ctx.strokeStyle = "rgba(88,226,255,0.86)";
    ctx.lineWidth = 3;
    ctx.strokeRect(photoX, photoY, photoW, photoH);

    const visorImg = new Image();
    visorImg.crossOrigin = "anonymous";
    visorImg.onload = () => {
      ctx.drawImage(visorImg, photoX + 8, photoY + 8, photoW - 16, photoH - 16);
      texture.needsUpdate = true;
    };
    visorImg.src =
      "https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?auto=format&fit=crop&w=1600&q=90";

    const visorTagX = 810;
    const visorTagY = 494;
    const visorTagW = 392;
    const visorTagH = 56;
    const visorTagGrad = ctx.createLinearGradient(visorTagX, visorTagY, visorTagX + visorTagW, visorTagY + visorTagH);
    visorTagGrad.addColorStop(0, "rgba(18,48,74,0.72)");
    visorTagGrad.addColorStop(1, "rgba(11,29,52,0.72)");
    ctx.fillStyle = visorTagGrad;
    ctx.beginPath();
    ctx.roundRect(visorTagX, visorTagY, visorTagW, visorTagH, 18);
    ctx.fill();
    ctx.strokeStyle = "rgba(92,230,255,0.82)";
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,162,232,0.56)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(visorTagX + 4, visorTagY + 4, visorTagW - 8, visorTagH - 8, 14);
    ctx.stroke();
    ctx.fillStyle = "#ecfbff";
    ctx.font = "800 22px 'Trebuchet MS'";
    ctx.fillText("VISOR VR · PREMIUM", 902, 530);

    const btnW = 620;
    const btnH = 88;
    const btnX = 80;
    const btnY = 600;
    const btnGradient = ctx.createLinearGradient(btnX, btnY, btnX + btnW, btnY + btnH);
    btnGradient.addColorStop(0, "rgba(20,122,156,0.72)");
    btnGradient.addColorStop(1, "rgba(10,66,103,0.7)");
    ctx.fillStyle = btnGradient;
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 26);
    ctx.fill();
    ctx.strokeStyle = "rgba(124,237,255,0.98)";
    ctx.lineWidth = 3.2;
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,166,233,0.62)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(btnX + 5, btnY + 5, btnW - 10, btnH - 10, 21);
    ctx.stroke();
    const ctaGlow = ctx.createRadialGradient(btnX + btnW / 2, btnY + btnH / 2, 20, btnX + btnW / 2, btnY + btnH / 2, 240);
    ctaGlow.addColorStop(0, "rgba(97,230,255,0.34)");
    ctaGlow.addColorStop(1, "rgba(97,230,255,0)");
    ctx.fillStyle = ctaGlow;
    ctx.fillRect(btnX - 50, btnY - 40, btnW + 100, btnH + 80);
    ctx.fillStyle = "#f2fdff";
    ctx.font = "900 38px 'Trebuchet MS'";
    ctx.fillText("INSCRIBIR ARTISTA", btnX + 122, btnY + 57);
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
    bg.addColorStop(0, "rgba(2,6,14,0.62)");
    bg.addColorStop(0.5, "rgba(4,10,22,0.55)");
    bg.addColorStop(1, "rgba(2,6,14,0.62)");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(70,228,255,0.96)";
    ctx.lineWidth = 4;
    ctx.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);
    ctx.strokeStyle = "rgba(66,198,255,0.72)";
    ctx.lineWidth = 2;
    ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);

    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fillRect(28, 32, canvas.width - 56, 68);

    ctx.font = "900 48px 'Trebuchet MS'";
    ctx.fillStyle = "#ff86d8";
    ctx.fillText("BOVEDA ONNIVERSO", 44, 78);

    const items = [
      {
        label: "Biblioteca",
        color: "#4dd8ff",
        x: 70,
        y: 150,
        iconUrl: "https://cdn.simpleicons.org/bookstack/ffffff",
      },
      {
        label: "Tickets",
        color: "#4dd8ff",
        x: 350,
        y: 150,
        iconUrl: "https://cdn.simpleicons.org/ticketmaster/ffffff",
      },
      {
        label: "Cursos",
        color: "#4dd8ff",
        x: 630,
        y: 150,
        iconUrl: "https://cdn.simpleicons.org/coursera/ffffff",
      },
      {
        label: "Skins",
        color: "#4dd8ff",
        x: 210,
        y: 296,
        iconUrl: "https://cdn.simpleicons.org/shield/ffffff",
      },
      {
        label: "VIP",
        color: "#4dd8ff",
        x: 490,
        y: 296,
        iconUrl: "https://cdn.simpleicons.org/openbadges/ffffff",
      },
    ];

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    const drawItem = (item: (typeof items)[number]) => {
      ctx.fillStyle = "rgba(0,0,0,0.24)";
      ctx.beginPath();
      ctx.roundRect(item.x, item.y, 250, 110, 22);
      ctx.fill();
      ctx.strokeStyle = `${item.color}cc`;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = "#ff9ce4";
      ctx.font = "800 30px 'Trebuchet MS'";
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

  const offlineTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 576;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(160,160,160,0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
    ctx.fillStyle = "rgba(245,245,245,0.9)";
    ctx.font = "700 82px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("OFF LINE", canvas.width / 2, canvas.height / 2);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }, []);


  const infoTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const drawBase = () => {
      const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      bg.addColorStop(0, "rgba(2,6,14,0.62)");
      bg.addColorStop(0.45, "rgba(4,10,22,0.55)");
      bg.addColorStop(1, "rgba(2,6,14,0.62)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const halo = ctx.createRadialGradient(840, 120, 30, 840, 120, 300);
      halo.addColorStop(0, "rgba(52,210,255,0.28)");
      halo.addColorStop(1, "rgba(70,212,255,0)");
      ctx.fillStyle = halo;
      ctx.fillRect(620, 0, 404, 320);

      ctx.strokeStyle = "rgba(70,228,255,0.96)";
      ctx.lineWidth = 4;
      ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);
      ctx.strokeStyle = "rgba(66,198,255,0.72)";
      ctx.lineWidth = 2;
      ctx.strokeRect(26, 26, canvas.width - 52, canvas.height - 52);

      ctx.fillStyle = "#ff86d8";
      ctx.font = "900 56px 'Trebuchet MS'";
      ctx.fillText("ONNIVERSO STORE", 52, 86);

      const cardW = 446;
      const cardH = 320;
      const y = 148;
      const leftX = 52;
      const rightX = 526;

      const drawCard = (
        x: number,
        title: string,
        subtitle: string,
        accent: string,
      ) => {
        const cardBg = ctx.createLinearGradient(x, y, x + cardW, y + cardH);
        cardBg.addColorStop(0, "rgba(4,12,24,0.58)");
        cardBg.addColorStop(1, "rgba(5,10,20,0.62)");
        ctx.fillStyle = cardBg;
        ctx.fillRect(x, y, cardW, cardH);
        ctx.strokeStyle = accent;
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 4, y + 4, cardW - 8, cardH - 8);

        ctx.fillStyle = "rgba(0,0,0,0.22)";
        ctx.fillRect(x + 18, y + 20, cardW - 36, 170);
        ctx.strokeStyle = "rgba(109,223,255,0.62)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 18, y + 20, cardW - 36, 170);

        ctx.fillStyle = "#ff86d8";
        ctx.font = "900 40px 'Trebuchet MS'";
        ctx.fillText(title, x + 22, y + 244);
        ctx.fillStyle = "rgba(255,206,239,0.95)";
        ctx.font = "700 22px 'Trebuchet MS'";
        ctx.fillText(subtitle, x + 22, y + 278);

        ctx.fillStyle = "rgba(22,188,255,0.16)";
        ctx.fillRect(x + 22, y + 290, 230, 16);
        ctx.strokeStyle = "rgba(91,218,255,0.6)";
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 22, y + 290, 230, 16);
      };

      drawCard(leftX, "BIBLIOTECA", "E-books premium + PDF", "rgba(84,224,255,0.92)");
      drawCard(rightX, "CURSOS VIRTUALES", "Masterclass y programas VR", "rgba(84,224,255,0.92)");
    };

    drawBase();
    const imageSpecs = [
      {
        x: 70,
        y: 168,
        w: 410,
        h: 130,
        url: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&w=1200&q=80",
      },
      {
        x: 544,
        y: 168,
        w: 410,
        h: 130,
        url: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80",
      },
    ];
    imageSpecs.forEach((spec) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        ctx.drawImage(img, spec.x, spec.y, spec.w, spec.h);
        texture.needsUpdate = true;
      };
      img.src = spec.url;
    });
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
      offlineTexture?.dispose();
    };
  }, [infoTexture, liveCardTexture, offlineTexture, socialTexture, systemTexture]);

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
    return (
      <group ref={clusterRef}>
        <Billboard position={[0, 0.18, 1.35]} follow>
          <mesh
            renderOrder={6}
            onPointerDown={(event) => {
              event.stopPropagation();
              onOpenVault?.();
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
              opacity={1}
            />
          </mesh>
        </Billboard>
        <Billboard position={[0, 0.18, -1.35]} follow>
          <mesh
            renderOrder={6}
            onPointerDown={(event) => {
              event.stopPropagation();
              const itemType = (event.uv?.x ?? 0.5) < 0.5 ? "biblioteca" : "cursos";
              onOpenStoreSetup?.(itemType);
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
              opacity={1}
            />
          </mesh>
        </Billboard>
        <Billboard position={[-1.35, 0.18, 0]} follow>
          <mesh
            renderOrder={6}
            onPointerDown={(event) => {
              event.stopPropagation();
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
              opacity={1}
            />
          </mesh>
        </Billboard>
        <Billboard position={[1.35, 0.18, 0]} follow>
          <mesh
            renderOrder={6}
            onDoubleClick={(event) => {
              event.stopPropagation();
              onCollapseScreens?.();
            }}
          >
            <planeGeometry args={[3, 1.8]} />
            <meshBasicMaterial
              map={(isUserLive ? systemTexture : offlineTexture) ?? undefined}
              toneMapped={false}
              side={THREE.DoubleSide}
              transparent
              opacity={1}
            />
          </mesh>
        </Billboard>
      </group>
    );
  }

  return (
    <group ref={clusterRef}>
      <mesh
        position={[0, 0.18, 1.35]}
        renderOrder={6}
        onPointerDown={(event) => {
          event.stopPropagation();
          onOpenVault?.();
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
          opacity={1}
        />
      </mesh>
      <mesh
        position={[0, 0.18, -1.35]}
        rotation={[0, Math.PI, 0]}
        renderOrder={6}
        onPointerDown={(event) => {
          event.stopPropagation();
          const itemType = (event.uv?.x ?? 0.5) < 0.5 ? "biblioteca" : "cursos";
          onOpenStoreSetup?.(itemType);
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
          opacity={1}
        />
      </mesh>
      <mesh
        position={[-1.35, 0.18, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        renderOrder={6}
        onPointerDown={(event) => {
          event.stopPropagation();
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
          opacity={1}
        />
      </mesh>
      <mesh
        position={[1.35, 0.18, 0]}
        rotation={[0, Math.PI / 2, 0]}
        renderOrder={6}
        onDoubleClick={(event) => {
          event.stopPropagation();
          onCollapseScreens?.();
        }}
      >
        <planeGeometry args={[3, 1.8]} />
        <meshBasicMaterial
          map={(isUserLive ? systemTexture : offlineTexture) ?? undefined}
          toneMapped={false}
          side={THREE.DoubleSide}
          transparent
          opacity={1}
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
        position={[MOON_ORBIT_RADIUS, -0.45, 0]}
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
  const [storeSetupOpen, setStoreSetupOpen] = useState(false);
  const [storeSetupType, setStoreSetupType] = useState<"biblioteca" | "cursos">("biblioteca");
  const [storePublishing, setStorePublishing] = useState(false);
  const [vaultOpen, setVaultOpen] = useState(false);
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
    if (!moonScreensVisible) setVaultOpen(false);
  }, [moonScreensVisible]);
  useEffect(() => {
    if (!moonScreensVisible) {
      setStoreSetupOpen(false);
      setStoreSetupType("biblioteca");
    }
  }, [moonScreensVisible]);
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

    const channel = supabase
      .channel(`public:active_streams:user:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "active_streams", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const next = payload.new as { is_live?: boolean } | null;
          if (next && typeof next.is_live === "boolean") {
            setIsUserLive(next.is_live);
            return;
          }
          void loadLive();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user]);
  const onStorePublish = async (payload: StorePublishPayload) => {
    if (!user) {
      toast.error("Debes iniciar sesion para publicar en tienda.");
      return;
    }
    setStorePublishing(true);
    try {
      const coverImageUrl = await uploadStoreAsset(user.id, payload.coverFile, "cover");
      let fileUrl: string | null = null;
      if (payload.itemType === "biblioteca" && payload.bookFile) {
        fileUrl = await uploadStoreAsset(user.id, payload.bookFile, "book");
      }
      await createStoreItem({
        userId: user.id,
        itemType: payload.itemType,
        title: payload.title,
        coverImageUrl,
        salePrice: payload.salePrice,
        fileUrl,
        videoUrl: payload.itemType === "cursos" ? payload.videoUrl : null,
      });
      toast.success("Publicado en tienda.");
      setStoreSetupOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo publicar el item.");
    } finally {
      setStorePublishing(false);
    }
  };

  const onProfileLiveAction = async () => {
    if (!user) {
      toast.error("Debes iniciar sesion para transmitir.");
      return;
    }
    setProfileSaving(true);
    try {
      const live = await createLivepeerStreamViaEdge(`${cardDisplayName} en vivo`);
      await startActiveStream({
        userId: user.id,
        streamUrl: live.ingestRtmp,
        title: `${cardDisplayName} en vivo`,
        category: "Social",
        privacyMode: "publico",
        playbackUrl: live.playbackUrl,
        playbackId: live.playbackId,
      });
      await updateProfileLiveState({
        userId: user.id,
        isLive: true,
        streamKey: live.streamKey,
        playbackId: live.playbackId,
      });
      const deviceKind = detectDeviceKind();
      if (deviceKind === "mobile") {
        setIsUserLive(true);
        const hls = livepeerPublicHlsUrl(live.playbackId);
        // En la app nativa: usar el puente Capacitor → plugin Android para abrir la cámara.
        if (Capacitor.isNativePlatform()) {
          try {
            await startNativeLiveStreaming(live.streamKey);
            toast.success("Abriendo cámara nativa para transmitir...");
          } catch {
            // Fallback: si el bridge/plugin no responde, intentar deep link nativo como respaldo.
            const dynamicUrl =
              live.transmitUrl?.trim() ||
              `onniverso://transmitir?key=${encodeURIComponent(live.streamKey)}&playbackId=${encodeURIComponent(live.playbackId)}&hls=${encodeURIComponent(hls)}`;
            window.location.href = dynamicUrl;
          }
        } else {
          // En navegador móvil: saltar a la app por deep link (si está instalada).
          const dynamicUrl =
            live.transmitUrl?.trim() ||
            `onniverso://transmitir?key=${encodeURIComponent(live.streamKey)}&playbackId=${encodeURIComponent(live.playbackId)}&hls=${encodeURIComponent(hls)}`;
          window.setTimeout(() => {
            window.location.href = dynamicUrl;
          }, 1000);
        }
      } else {
        toast.info("La emision desde PC esta desactivada por ahora.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo generar la llave LIVE.");
    } finally {
      setProfileSaving(false);
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
              onOpenVault={() => setVaultOpen((prev) => !prev)}
              onOpenLiveRequest={() => setLiveRequestOpen((prev) => !prev)}
              onOpenStoreSetup={(itemType) => {
                setStoreSetupType(itemType);
                setStoreSetupOpen(true);
              }}
              onCollapseScreens={() => setMoonScreensVisible(false)}
              isUserLive={isUserLive}
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
          <div className="pointer-events-auto origin-center scale-[0.63] -translate-y-[clamp(7rem,34vh,20rem)]">
            <ProfileCard
              initialName={cardDisplayName}
              initialAvatarSrc={cardAvatarSrc}
              isSaving={profileSaving}
              onConfirm={onProfileConfirm}
              onLiveAction={onProfileLiveAction}
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
      {!vrStereoActive && moonScreensVisible && storeSetupOpen && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-4">
          <button
            type="button"
            aria-label="Cerrar tienda"
            className="pointer-events-auto absolute inset-0"
            onClick={() => setStoreSetupOpen(false)}
          />
          <div className="pointer-events-auto origin-center scale-[0.66] -translate-y-[clamp(3.75rem,22vh,13rem)]">
            <StorePublishCard
              isSubmitting={storePublishing}
              onSubmit={onStorePublish}
              initialItemType={storeSetupType}
              lockedItemType
              onClose={() => setStoreSetupOpen(false)}
            />
          </div>
        </div>
      )}
      {!vrStereoActive && moonScreensVisible && vaultOpen && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-4">
          <button
            type="button"
            aria-label="Cerrar boveda"
            className="pointer-events-auto absolute inset-0"
            onClick={() => setVaultOpen(false)}
          />
          <div className="pointer-events-auto origin-center scale-[0.72] -translate-y-[clamp(3.75rem,22vh,13rem)]">
            <VaultCard userId={user?.id} onClose={() => setVaultOpen(false)} />
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
