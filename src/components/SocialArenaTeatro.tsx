import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls, Stars } from "@react-three/drei";
import {
  Suspense,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from "react";
import type { ReactNode } from "react";
import * as THREE from "three";
import {
  MAX_WEBGL_PIXEL_RATIO,
  applyPixelRatioCap,
  isMobileCoarseDevice,
} from "@/lib/webglRendererPrefs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type ArenaZone = "default" | "platinum" | "bar" | "parche";

const ZONE_PRESETS: Record<
  ArenaZone,
  { pos: [number, number, number]; target: [number, number, number] }
> = {
  default: { pos: [0, 3.4, 13.5], target: [0, 2.8, -4] },
  platinum: { pos: [-11.5, 5.2, 5], target: [-4, 3, -3] },
  bar: { pos: [10.5, 2.8, 7.5], target: [4, 2, -1] },
  parche: { pos: [11.8, 3.4, 3], target: [2, 2.4, -4] },
};

const ArenaNavContext = createContext<(zone: ArenaZone) => void>(() => {});

function CameraRig({ children }: { children: ReactNode }) {
  const { camera } = useThree();
  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const destPos = useRef(new THREE.Vector3(...ZONE_PRESETS.default.pos));
  const destTarget = useRef(new THREE.Vector3(...ZONE_PRESETS.default.target));

  const moveToZone = useCallback((zone: ArenaZone) => {
    const p = ZONE_PRESETS[zone];
    destPos.current.set(...p.pos);
    destTarget.current.set(...p.target);
  }, []);

  useFrame((_, delta) => {
    const c = controlsRef.current;
    if (!c) return;
    const smooth = 1 - Math.pow(0.85, delta * 55);
    camera.position.lerp(destPos.current, smooth);
    c.target.lerp(destTarget.current, smooth);
    c.update();
  });

  return (
    <ArenaNavContext.Provider value={moveToZone}>
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enablePan
        minPolarAngle={0.28}
        maxPolarAngle={Math.PI * 0.49}
        minDistance={4}
        maxDistance={30}
        enableDamping
        dampingFactor={0.055}
        rotateSpeed={0.42}
        target={[0, 2.8, -4]}
      />
      {children}
    </ArenaNavContext.Provider>
  );
}

function useArenaNav() {
  return useContext(ArenaNavContext);
}

interface AvatarProps {
  position: [number, number, number];
  rotationY?: number;
  seated?: boolean;
  color: string;
}

function AvatarFigure({ position, rotationY = 0, seated = false, color }: AvatarProps) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {seated ? (
        <group rotation={[-Math.PI / 2.3, 0, 0]} position={[0, 0.38, 0]}>
          <mesh>
            <cylinderGeometry args={[0.14, 0.16, 0.42, 12]} />
            <meshStandardMaterial color={color} metalness={0.35} roughness={0.45} />
          </mesh>
          <mesh position={[0, 0, 0.22]} rotation={[0.25, 0, 0]}>
            <sphereGeometry args={[0.12, 14, 14]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.1} roughness={0.65} />
          </mesh>
          <mesh position={[0.08, 0.08, 0.12]} rotation={[0, 0, -0.6]}>
            <boxGeometry args={[0.06, 0.3, 0.06]} />
            <meshStandardMaterial color={color} metalness={0.2} roughness={0.5} />
          </mesh>
        </group>
      ) : (
        <>
          <mesh position={[0, 0.32, 0]}>
            <cylinderGeometry args={[0.17, 0.19, 0.48, 14]} />
            <meshStandardMaterial color={color} metalness={0.35} roughness={0.45} />
          </mesh>
          <mesh position={[0, 0.72, 0.05]}>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshStandardMaterial color="#f1f5f9" metalness={0.08} roughness={0.7} />
          </mesh>
          <mesh position={[0.16, 0.52, 0]}>
            <boxGeometry args={[0.18, 0.06, 0.06]} />
            <meshStandardMaterial color="#0f172a" metalness={0.4} roughness={0.35} />
          </mesh>
        </>
      )}
    </group>
  );
}

function ArenaFloor() {
  return (
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
      <mesh receiveShadow>
        <circleGeometry args={[32, 96]} />
        <meshStandardMaterial
          color="#060a12"
          metalness={0.92}
          roughness={0.18}
          envMapIntensity={1.2}
        />
      </mesh>
      <mesh position={[0, 0.003, 0]} rotation={[0, 0, -0.05]}>
        <ringGeometry args={[7.5, 7.65, 128]} />
        <meshBasicMaterial color="#22ffcc" transparent opacity={0.35} />
      </mesh>
      <mesh position={[0, 0.003, 0]} rotation={[0, 0, 0.12]}>
        <ringGeometry args={[14, 14.14, 128]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.28} />
      </mesh>
    </group>
  );
}

function PlatinumStands() {
  const blocks = useMemo(() => {
    const out: Array<{ x: number; y: number; z: number; e: number }> = [];
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 18; col++) {
        const t = (col / 18) * Math.PI * 0.44 + Math.PI * 0.58;
        const r = 17 + row * 1.05;
        const em = 0.35 + (col % 5) * 0.05;
        out.push({
          x: Math.cos(t) * r - 2.2,
          y: 1 + row * 0.36,
          z: Math.sin(t) * r - 1.1,
          e: em,
        });
      }
    }
    return out;
  }, []);

  return (
    <group>
      {blocks.map((b, i) => (
        <mesh key={i} position={[b.x, b.y, b.z]}>
          <boxGeometry args={[0.2, 0.28, 0.12]} />
          <meshStandardMaterial
            color="#172554"
            emissive="#2563eb"
            emissiveIntensity={0.35 + b.e * 0.08}
            metalness={0.4}
            roughness={0.35}
          />
        </mesh>
      ))}
    </group>
  );
}

function VipLoungers() {
  const seats = useMemo(
    () =>
      [
        { p: [-7, 0, 6] as [number, number, number], ry: 0.45, c: "#7c3aed" },
        { p: [-6.2, 0, 6.8] as [number, number, number], ry: 0.35, c: "#06b6d4" },
        { p: [-8, 0, 6.9] as [number, number, number], ry: 0.7, c: "#22c55e" },
        { p: [-6.8, 0, 7.9] as [number, number, number], ry: 0.2, c: "#f472b6" },
        { p: [-7.6, 0, 8.2] as [number, number, number], ry: 0.5, c: "#eab308" },
        { p: [-8.6, 0, 7.3] as [number, number, number], ry: 0.85, c: "#38bdf8" },
      ],
    [],
  );
  return (
    <group>
      <mesh position={[-7.5, 0.35, 7.2]} rotation={[0, 0.3, 0]}>
        <boxGeometry args={[4.5, 0.5, 2.2]} />
        <meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.25} />
      </mesh>
      {seats.map((s, i) => (
        <AvatarFigure key={i} position={s.p} rotationY={s.ry} seated color={s.c} />
      ))}
    </group>
  );
}

function ParcheCrowd() {
  const items = useMemo(() => {
    return Array.from({ length: 16 }).map((_, i) => {
      const ang = (i / 16) * Math.PI * 1.1 + Math.PI * 0.15;
      const r = 8.5 + (i % 3) * 0.4;
      return {
        p: [Math.cos(ang) * r + 5, 0, Math.sin(ang) * r + 2.5] as [number, number, number],
        ry: ang + Math.PI / 2,
        c: i % 2 ? "#22d3ee" : "#f97316",
      };
    });
  }, []);

  return (
    <group>
      {items.map((item, i) => (
        <AvatarFigure key={i} position={item.p} rotationY={item.ry} color={item.c} />
      ))}
    </group>
  );
}

function ClickZone({
  zone,
  position,
  radius,
  label,
  color,
}: {
  zone: ArenaZone;
  position: [number, number, number];
  radius: number;
  label: string;
  color: string;
}) {
  const moveToZone = useArenaNav();
  return (
    <group position={position}>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerDown={(e) => {
          e.stopPropagation();
          moveToZone(zone);
        }}
      >
        <circleGeometry args={[radius, 48]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.38}
          emissive={color}
          emissiveIntensity={0.55}
        />
      </mesh>
      <Html position={[0, 0.08, 0]} center distanceFactor={12}>
        <div className="pointer-events-none text-center">
          <span className="rounded-full border border-cyan-400/50 bg-black/60 px-3 py-1 text-[10px] font-display font-bold uppercase tracking-widest text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.4)] backdrop-blur-md">
            {label}
          </span>
        </div>
      </Html>
    </group>
  );
}

function ScreenGlowLight() {
  const ref = useRef<THREE.PointLight>(null);
  const accentRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ref.current) {
      ref.current.intensity = 3.2 + Math.sin(t * 5.2) * 0.9 + Math.sin(t * 13.4) * 0.35;
    }
    if (accentRef.current) {
      accentRef.current.intensity = 1.6 + Math.sin(t * 7.1 + 1) * 0.5;
    }
  });

  return (
    <>
      <pointLight ref={ref} position={[0, 4.3, -10.8]} color="#7dd3fc" distance={40} decay={2} />
      <pointLight ref={accentRef} position={[0, 1.5, -8]} color="#fbbf24" distance={28} decay={2} />
    </>
  );
}

function CurvedScreen({
  videoUrl,
  videoId,
  title,
}: {
  videoUrl?: string;
  videoId?: string;
  title: string;
}) {
  return (
    <group>
      <mesh position={[0, 4.1, -11.4]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[9.2, 9.2, 3.6, 48, 1, true, Math.PI * 0.54, Math.PI * 0.92]} />
        <meshStandardMaterial
          color="#020617"
          emissive="#38bdf8"
          emissiveIntensity={0.5}
          metalness={0.88}
          roughness={0.15}
        />
      </mesh>
      <mesh position={[0, 4.1, -10.85]}>
        <planeGeometry args={[15.5, 8.2]} />
        <meshStandardMaterial
          color="#010814"
          emissive="#0ea5e9"
          emissiveIntensity={0.58}
          transparent
          opacity={0.5}
        />
      </mesh>
      <ScreenGlowLight />
      <mesh position={[0, 4.1, -11.55]}>
        <planeGeometry args={[16.2, 8.6]} />
        <meshBasicMaterial color="#0f172a" transparent opacity={0.22} />
      </mesh>

      <Html
        transform
        position={[0, 4.1, -10.65]}
        occlude
        distanceFactor={10}
        style={{
          width: "min(72vw, 720px)",
          height: "min(40.5vw, 405px)",
          pointerEvents: "auto",
        }}
      >
        <div className="relative h-full w-full overflow-hidden rounded-xl border-2 border-cyan-400/50 shadow-[0_0_50px_rgba(34,211,238,0.45)]">
          <div className="absolute left-2 top-2 z-10 flex items-center gap-2 rounded bg-red-600/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
            LIVE NOW
          </div>
          {videoUrl ? (
            <video
              title={title}
              className="h-full w-full bg-black object-cover"
              src={videoUrl}
              controls
              autoPlay
              muted
              loop
              playsInline
            />
          ) : videoId ? (
            <iframe
              title={title}
              className="h-full w-full bg-black"
              src={`https://www.youtube.com/embed/${videoId}?rel=0`}
              allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ) : null}
        </div>
      </Html>
    </group>
  );
}

function SpatialHud({
  messages,
  chatInput,
  onChatInput,
  onSend,
}: {
  messages: string[];
  chatInput: string;
  onChatInput: (v: string) => void;
  onSend: () => void;
}) {
  const moveToZone = useArenaNav();
  return (
    <Html position={[10, 6.2, 2]} transform distanceFactor={8}>
      <div className="flex w-[260px] flex-col gap-2 rounded-2xl border border-emerald-400/40 bg-black/45 p-3 shadow-[0_0_40px_rgba(16,185,129,0.35)] backdrop-blur-xl">
        <p className="text-center text-[10px] font-display font-bold uppercase tracking-[0.25em] text-emerald-300">
          HUD espacial
        </p>
        <button
          type="button"
          onClick={() => moveToZone("default")}
          className="rounded-lg border border-white/20 bg-white/5 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-200 hover:bg-white/10"
        >
          Vista inicial (escenario)
        </button>
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("social-arena:shop"))}
            className="rounded-lg border border-cyan-400/50 bg-gradient-to-r from-cyan-500/20 to-blue-600/20 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-cyan-100"
          >
            MERCH SHOP
          </button>
          <button
            type="button"
            className="rounded-lg border border-emerald-400/55 bg-gradient-to-r from-emerald-500/25 to-teal-600/20 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-emerald-100"
          >
            GLOBAL CHAT
          </button>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("social-arena:vr"))}
            className="rounded-lg border border-sky-500/50 bg-gradient-to-r from-sky-500/20 to-indigo-600/25 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-sky-100"
          >
            VR SETTINGS
          </button>
        </div>
        <div className="mt-1 max-h-28 space-y-1 overflow-y-auto rounded-lg border border-white/10 bg-black/50 p-2 text-[11px] text-slate-200">
          {messages.slice(-5).map((m, i) => (
            <p key={`${i}-${m.slice(0, 12)}`} className="leading-snug">
              • {m}
            </p>
          ))}
        </div>
        <div className="flex gap-1">
          <Input
            value={chatInput}
            onChange={(e) => onChatInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSend()}
            placeholder="Mensaje global..."
            className="h-8 border-emerald-500/35 bg-black/50 text-xs"
          />
          <Button size="sm" variant="heroOutline" className="h-8 px-2" onClick={onSend}>
            OK
          </Button>
        </div>
      </div>
    </Html>
  );
}

function BrandBanner() {
  return (
    <Html position={[0, 10.5, -4]} center distanceFactor={14}>
      <div className="pointer-events-none text-center">
        <p className="font-display text-sm font-bold uppercase tracking-[0.4em] text-cyan-300 drop-shadow-[0_0_24px_rgba(34,211,238,0.7)]">
          ADH STUDIOS
        </p>
        <p className="mt-1 text-[11px] font-display uppercase tracking-[0.15em] text-emerald-200/90">
          The pinnacle of immersive social connection
        </p>
      </div>
    </Html>
  );
}

function SpeechBubbles() {
  return (
    <>
      <Html position={[-7.2, 2.4, 7]} center distanceFactor={10}>
        <div className="max-w-[140px] rounded-xl border border-emerald-400/40 bg-black/65 px-2 py-1.5 text-[11px] leading-tight text-emerald-50 shadow-lg backdrop-blur-md">
          Increible! Saludos desde Bogota.
        </div>
      </Html>
      <Html position={[6, 2.6, 4]} center distanceFactor={10}>
        <div className="max-w-[120px] rounded-xl border border-cyan-400/40 bg-black/65 px-2 py-1.5 text-[11px] text-cyan-50 shadow-lg backdrop-blur-md">
          🔥 Esta sala esta epica
        </div>
      </Html>
      <Html position={[4.5, 2.2, 6]} center distanceFactor={10}>
        <div className="rounded-xl border border-orange-400/40 bg-black/65 px-2 py-1 text-[11px] text-orange-100 shadow-lg backdrop-blur-md">
          👍 The Parche on fire
        </div>
      </Html>
    </>
  );
}

function ArenaScene({
  videoUrl,
  videoId,
  roomTitle,
  messages,
  chatInput,
  onChatInput,
  onSend,
}: {
  videoUrl?: string;
  videoId?: string;
  roomTitle: string;
  messages: string[];
  chatInput: string;
  onChatInput: (v: string) => void;
  onSend: () => void;
}) {
  return (
    <>
      <color attach="background" args={["#02040a"]} />
      <fog attach="fog" args={["#02040a", 22, 58]} />

      <hemisphereLight intensity={0.35} groundColor="#111827" color="#38bdf8" />
      <ambientLight intensity={0.22} />
      <directionalLight position={[14, 22, 10]} intensity={0.55} color="#bae6fd" />
      <pointLight position={[-16, 8, -4]} intensity={1.8} color="#22d3ee" distance={50} decay={2} />
      <pointLight position={[16, 6, 6]} intensity={1.4} color="#fb923c" distance={45} decay={2} />

      <Stars radius={80} depth={50} count={2200} factor={3} saturation={0} fade speed={0.6} />

      <ArenaFloor />
      <PlatinumStands />
      <VipLoungers />
      <ParcheCrowd />

      <mesh position={[0, 0.5, -14]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[24, 24, 12, 64, 1, true]} />
        <meshStandardMaterial
          side={THREE.BackSide}
          color="#0b1224"
          metalness={0.9}
          roughness={0.2}
          emissive="#132047"
          emissiveIntensity={0.15}
        />
      </mesh>

      <CurvedScreen videoUrl={videoUrl} videoId={videoId} title={roomTitle} />

      <ClickZone zone="platinum" position={[-10, 0.02, 4]} radius={2.8} label="Platinum Palco" color="#22d3ee" />
      <ClickZone zone="bar" position={[9, 0.02, 5]} radius={2.2} color="#f97316" label="Bar / Lounge" />
      <ClickZone zone="parche" position={[8, 0.02, 1.5]} radius={2.4} color="#34d399" label="The Parche" />

      <SpatialHud
        messages={messages}
        chatInput={chatInput}
        onChatInput={onChatInput}
        onSend={onSend}
      />

      <SpeechBubbles />

      <BrandBanner />
    </>
  );
}

interface SocialArenaTeatroProps {
  /** MP4 directo (p. ej. Cloudinary); si está definido, tiene prioridad sobre YouTube. */
  videoUrl?: string;
  /** ID de vídeo YouTube (solo si no hay videoUrl). */
  videoId?: string;
  roomTitle: string;
  className?: string;
  messages: string[];
  chatInput: string;
  onChatInput: (v: string) => void;
  onSend: () => void;
}

export default function SocialArenaTeatro({
  videoUrl,
  videoId,
  roomTitle,
  className,
  messages,
  chatInput,
  onChatInput,
  onSend,
}: SocialArenaTeatroProps) {
  const mobileCoarse = useMemo(() => isMobileCoarseDevice(), []);

  return (
    <div className={className}>
      <Canvas
        gl={{ antialias: !mobileCoarse, alpha: false }}
        camera={{ position: ZONE_PRESETS.default.pos, fov: 55, near: 0.1, far: 200 }}
        dpr={[1, MAX_WEBGL_PIXEL_RATIO]}
        onCreated={({ gl }) => {
          applyPixelRatioCap(gl);
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
      >
        <Suspense fallback={null}>
          <CameraRig>
            <ArenaScene
              videoUrl={videoUrl}
              videoId={videoId}
              roomTitle={roomTitle}
              messages={messages}
              chatInput={chatInput}
              onChatInput={onChatInput}
              onSend={onSend}
            />
          </CameraRig>
        </Suspense>
      </Canvas>
    </div>
  );
}
