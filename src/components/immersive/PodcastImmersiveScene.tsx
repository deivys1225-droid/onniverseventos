import { Billboard, Html } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import * as THREE from "three";
import { SRGBColorSpace } from "three";
import { Button } from "@/components/ui/button";
import {
  EquirectangularInterior,
  ImmersiveOrbitControls,
  SPHERE_RADIUS,
} from "@/components/immersive/equirectSphereCore";
import { type StreamerProfile } from "@/data/podcastStreamers";
import {
  MAX_WEBGL_PIXEL_RATIO,
  OPTIMIZED_SPHERE_SEGMENTS,
  applyPixelRatioCap,
  isMobileCoarseDevice,
} from "@/lib/webglRendererPrefs";
import { useVrModeActive } from "@/hooks/useVrModeActive";

type ReactionKind = "risas" | "aplausos" | "epico";

const reactionConfig: Record<ReactionKind, { label: string; emoji: string }> = {
  risas: { label: "Risas", emoji: "😂" },
  aplausos: { label: "Aplausos", emoji: "👏" },
  epico: { label: "Epico", emoji: "🔥" },
};

function makeButtonTexture(emoji: string, label: string) {
  const w = 512;
  const h = 220;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "rgba(15,23,42,0.92)");
  g.addColorStop(1, "rgba(30,41,59,0.88)");
  ctx.fillStyle = g;
  const r = 28;
  const x = 8;
  const y = 8;
  const rw = w - 16;
  const rh = h - 16;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + rw - r, y);
  ctx.quadraticCurveTo(x + rw, y, x + rw, y + r);
  ctx.lineTo(x + rw, y + rh - r);
  ctx.quadraticCurveTo(x + rw, y + rh, x + rw - r, y + rh);
  ctx.lineTo(x + r, y + rh);
  ctx.quadraticCurveTo(x, y + rh, x, y + rh - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(34,211,238,0.55)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.font = "bold 72px 'Segoe UI Emoji', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(emoji, w / 2, 110);
  ctx.font = "bold 38px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "rgba(226,232,240,0.95)";
  ctx.fillText(label, w / 2, 178);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function SpatialReactionButtons({
  onReaction,
}: {
  onReaction: (k: ReactionKind) => void;
}) {
  const kinds = useMemo(() => Object.keys(reactionConfig) as ReactionKind[], []);
  const textures = useMemo(
    () =>
      kinds.map((k) => {
        const { emoji, label } = reactionConfig[k];
        return makeButtonTexture(emoji, label);
      }),
    [kinds],
  );

  const positions: [number, number, number][] = [
    [-2.85, -0.28, -4.55],
    [0, -0.38, -4.3],
    [2.85, -0.28, -4.55],
  ];

  return (
    <>
      {kinds.map((kind, i) => (
        <Billboard key={kind} position={positions[i]} follow>
          <mesh
            onClick={(e) => {
              e.stopPropagation();
              onReaction(kind);
            }}
            onPointerOver={() => {
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => {
              document.body.style.cursor = "auto";
            }}
          >
            <planeGeometry args={[2.25, 0.96]} />
            <meshBasicMaterial map={textures[i]} transparent opacity={0.98} depthTest depthWrite={false} />
          </mesh>
        </Billboard>
      ))}
    </>
  );
}

function FloatingEmojiBurst({
  emoji,
  onDone,
}: {
  emoji: string;
  onDone: () => void;
}) {
  const group = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const doneRef = useRef(false);
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext("2d");
    if (!ctx) return new THREE.CanvasTexture(c);
    ctx.font = "200px 'Segoe UI Emoji', system-ui, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(emoji, 128, 140);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  }, [emoji]);
  const t = useRef(0);
  const xOff = useMemo(() => 0.35 + Math.random() * 0.5, []);
  useFrame((_, delta) => {
    t.current += delta;
    if (group.current) {
      group.current.position.y += delta * 1.8;
      const s = 1 + t.current * 0.35;
      group.current.scale.setScalar(s);
    }
    const mat = meshRef.current?.material as THREE.MeshBasicMaterial | undefined;
    if (mat) {
      mat.opacity = Math.max(0, 1 - t.current / 1.35);
    }
    if (t.current > 1.35 && !doneRef.current) {
      doneRef.current = true;
      onDone();
    }
  });
  return (
    <group ref={group} position={[xOff, 0.35, -4.35]}>
      <Billboard follow>
        <mesh ref={meshRef}>
          <planeGeometry args={[1.15, 1.15]} />
          <meshBasicMaterial map={tex} transparent opacity={1} depthWrite={false} />
        </mesh>
      </Billboard>
    </group>
  );
}

function VideoEquirectangularInterior({ url }: { url: string }) {
  const { video, texture } = useMemo(() => {
    const element = document.createElement("video");
    element.src = url;
    element.crossOrigin = "anonymous";
    element.loop = true;
    element.muted = true;
    element.autoplay = true;
    element.playsInline = true;
    element.preload = "auto";
    const videoTexture = new THREE.VideoTexture(element);
    videoTexture.colorSpace = SRGBColorSpace;
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.generateMipmaps = false;
    return { video: element, texture: videoTexture };
  }, [url]);

  useEffect(() => {
    void video.play().catch(() => undefined);
    const resume = () => {
      void video.play().catch(() => undefined);
    };
    window.addEventListener("pointerdown", resume, { once: true });
    window.addEventListener("touchstart", resume, { once: true });
    return () => {
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("touchstart", resume);
      texture.dispose();
      video.pause();
      video.src = "";
      video.load();
    };
  }, [texture, video]);

  return (
    <mesh>
      <sphereGeometry args={[SPHERE_RADIUS, OPTIMIZED_SPHERE_SEGMENTS, OPTIMIZED_SPHERE_SEGMENTS]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} depthWrite={false} />
    </mesh>
  );
}

function InlineVideoScreen({ url }: { url: string }) {
  const { video, texture } = useMemo(() => {
    const element = document.createElement("video");
    element.src = url;
    element.crossOrigin = "anonymous";
    element.loop = true;
    element.muted = true;
    element.autoplay = true;
    element.playsInline = true;
    element.preload = "auto";
    const videoTexture = new THREE.VideoTexture(element);
    videoTexture.colorSpace = SRGBColorSpace;
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.generateMipmaps = false;
    return { video: element, texture: videoTexture };
  }, [url]);

  useEffect(() => {
    void video.play().catch(() => undefined);
    const resume = () => void video.play().catch(() => undefined);
    window.addEventListener("pointerdown", resume, { once: true });
    window.addEventListener("touchstart", resume, { once: true });
    return () => {
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("touchstart", resume);
      texture.dispose();
      video.pause();
      video.src = "";
      video.load();
    };
  }, [texture, video]);

  return (
    <group position={[0, 1.35, -8.6]}>
      <mesh>
        <planeGeometry args={[6.2, 3.48]} />
        <meshBasicMaterial map={texture} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function SceneContent({
  streamer,
  embedUrl,
  videoIn360Background,
  vrModeActive,
  onToggleVideoTarget,
  messages,
  chatInput,
  onChatInput,
  onSendChat,
  onReaction,
  bursts,
  onBurstDone,
}: {
  streamer: StreamerProfile;
  embedUrl: string;
  videoIn360Background: boolean;
  vrModeActive: boolean;
  onToggleVideoTarget: () => void;
  messages: string[];
  chatInput: string;
  onChatInput: (v: string) => void;
  onSendChat: () => void;
  onReaction: (k: ReactionKind) => void;
  bursts: Array<{ id: number; kind: ReactionKind }>;
  onBurstDone: (id: number) => void;
}) {
  return (
    <>
      <Suspense fallback={null}>
        {videoIn360Background ? (
          <VideoEquirectangularInterior url={embedUrl} />
        ) : (
          <EquirectangularInterior url={streamer.panoramaImage.trim()} />
        )}
      </Suspense>

      <ambientLight intensity={0.85} />
      <directionalLight position={[4, 10, 6]} intensity={0.35} />



      {!videoIn360Background && !vrModeActive && (
        <Html position={[0, 1.35, -8.6]} transform distanceFactor={11} center style={{ width: "min(72vw, 620px)" }}>
          <div
            className="rounded-2xl border border-white/25 bg-black/50 p-2 shadow-[0_40px_120px_rgba(0,0,0,0.85)] backdrop-blur-md"
            style={{ pointerEvents: "auto" }}
          >
            <div className="aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black">
              <video
                src={embedUrl}
                className="h-full w-full border-0 object-cover"
                autoPlay
                muted
                loop
                playsInline
                controls
              />
              <Button
                type="button"
                size="sm"
                onClick={onToggleVideoTarget}
                className="absolute -right-14 top-3 z-20 h-8 rounded-full border border-amber-200 bg-amber-300 px-4 text-xs font-bold uppercase tracking-wider text-black shadow-[0_0_18px_rgba(251,191,36,0.75)] hover:bg-amber-200"
              >
                360
              </Button>
            </div>
          </div>
        </Html>
      )}
      {!videoIn360Background && vrModeActive && <InlineVideoScreen url={embedUrl} />}

      {videoIn360Background && (
        <Html position={[6.6, 4.05, -8.1]} transform distanceFactor={9.2}>
          <Button
            type="button"
            size="sm"
            onClick={onToggleVideoTarget}
            className="h-8 rounded-full border border-amber-200 bg-amber-300 px-4 text-xs font-bold uppercase tracking-wider text-black shadow-[0_0_18px_rgba(251,191,36,0.75)] hover:bg-amber-200"
          >
            360
          </Button>
        </Html>
      )}

      <Html position={[-4.8, 2.45, -7.2]} transform distanceFactor={9.2}>
        <div
          className="flex max-w-sm flex-col gap-2 rounded-2xl border border-cyan-500/30 bg-black/55 p-3 text-left shadow-lg backdrop-blur-xl"
          style={{ pointerEvents: "auto" }}
        >
          <Link
            to="/podcast-hub"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/45 px-3 py-1.5 text-[10px] font-display font-bold uppercase tracking-wider text-cyan-100"
          >
            ← Podcast Hub
          </Link>
          <div>
            <p className="text-[9px] uppercase tracking-[0.2em] text-primary">{streamer.immersiveSalaName}</p>
            <p className="font-display text-base font-bold text-white">{streamer.name}</p>
            <p className="text-[11px] text-slate-400">{streamer.loungeDescription}</p>
          </div>
        </div>
      </Html>

    </>
  );
}

export interface PodcastImmersiveSceneProps {
  streamer: StreamerProfile;
  messages: string[];
  chatInput: string;
  onChatInput: (v: string) => void;
  onSendChat: () => void;
  onReaction: (k: ReactionKind) => void;
  bursts: Array<{ id: number; kind: ReactionKind }>;
  onBurstDone: (id: number) => void;
}

export default function PodcastImmersiveScene({
  streamer,
  messages,
  chatInput,
  onChatInput,
  onSendChat,
  onReaction,
  bursts,
  onBurstDone,
}: PodcastImmersiveSceneProps) {
  const embedUrl = streamer.salaVideoUrl ?? "/videos/beele.mp4";
  const [videoIn360Background, setVideoIn360Background] = useState(false);
  const mobileCoarse = useMemo(() => isMobileCoarseDevice(), []);
  const vrModeActive = useVrModeActive();

  const onPointerMissed = useCallback(() => {}, []);

  return (
    <div className="h-[100dvh] w-full touch-none bg-black [&_*]:outline-none" style={{ touchAction: "none" }}>
      <Canvas
        gl={{ antialias: !mobileCoarse, alpha: false, powerPreference: "high-performance" }}
        camera={{ position: [0, 0, 0.12], fov: 84, far: SPHERE_RADIUS * 2 }}
        onPointerMissed={onPointerMissed}
        dpr={[1, MAX_WEBGL_PIXEL_RATIO]}
        onCreated={({ gl }) => applyPixelRatioCap(gl)}
      >
        <Suspense fallback={null}>
          <SceneContent
            streamer={streamer}
            embedUrl={embedUrl}
            videoIn360Background={videoIn360Background}
            vrModeActive={vrModeActive}
            onToggleVideoTarget={() => setVideoIn360Background((prev) => !prev)}
            messages={messages}
            chatInput={chatInput}
            onChatInput={onChatInput}
            onSendChat={onSendChat}
            onReaction={onReaction}
            bursts={bursts}
            onBurstDone={onBurstDone}
          />
        </Suspense>
        <ImmersiveOrbitControls />
      </Canvas>
    </div>
  );
}

export type { ReactionKind };
