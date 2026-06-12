import { Bounds, useGLTF } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import type { OnniAvatarState } from "@/components/OnniAvatar";
import { publicLocalGlbUrl } from "@/lib/publicAssetUrl";
import { applyPixelRatioCap } from "@/lib/webglRendererPrefs";
import { cn } from "@/lib/utils";

const MODEL_URL = publicLocalGlbUrl("assets/models/onni-humanoide.glb");

type OnniAvatarGlbProps = {
  size?: "sm" | "md" | "lg" | "hero";
  state?: OnniAvatarState;
  className?: string;
  title?: string;
};

const sizeBox = {
  sm: "h-12 w-12",
  md: "h-[72px] w-[72px]",
  lg: "h-[96px] w-[96px]",
  hero: "h-[240px] w-[240px]",
} as const;

function fixTextureColorSpace(tex: THREE.Texture | null | undefined) {
  if (!tex) return;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
}

function preserveOriginalGlbMaterials(root: THREE.Object3D) {
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    const normalize = (mat: THREE.Material): THREE.Material => {
      const clone = mat.clone();
      if (clone instanceof THREE.MeshStandardMaterial || clone instanceof THREE.MeshPhysicalMaterial) {
        fixTextureColorSpace(clone.map);
        fixTextureColorSpace(clone.emissiveMap);
        fixTextureColorSpace(clone.normalMap);
        fixTextureColorSpace(clone.roughnessMap);
        fixTextureColorSpace(clone.metalnessMap);
      } else if (clone instanceof THREE.MeshBasicMaterial) {
        fixTextureColorSpace(clone.map);
      }
      return clone;
    };
    node.material = Array.isArray(node.material) ? node.material.map(normalize) : normalize(node.material);
  });
}

function measureBounds(root: THREE.Object3D) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root, true);
  return {
    size: box.getSize(new THREE.Vector3()),
    center: box.getCenter(new THREE.Vector3()),
  };
}

function fitStandingModel(root: THREE.Object3D): void {
  root.updateMatrixWorld(true);
  let { size, center } = measureBounds(root);

  if (size.y < size.x * 0.85 && size.y < size.z * 0.85) {
    if (size.x >= size.z) root.rotation.z = Math.PI / 2;
    else root.rotation.x = -Math.PI / 2;
    root.updateMatrixWorld(true);
    ({ size, center } = measureBounds(root));
  }

  root.position.sub(center);
  // Auto-orienta al frente: el frente suele ocupar mayor ancho que el perfil.
  const candidateAngles = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
  let bestAngle = 0;
  let bestWidth = -1;
  for (const angle of candidateAngles) {
    root.rotation.y = angle;
    root.updateMatrixWorld(true);
    const candidateSize = measureBounds(root).size;
    if (candidateSize.x > bestWidth) {
      bestWidth = candidateSize.x;
      bestAngle = angle;
    }
  }
  root.rotation.y = bestAngle;

  root.updateMatrixWorld(true);
  ({ size } = measureBounds(root));

  const targetHeight = 1.75;
  const scale = targetHeight / Math.max(size.y, 1e-6);
  root.scale.setScalar(scale);
}

function OnniGlbModel({
  state,
  onReady,
}: {
  state: OnniAvatarState;
  onReady: () => void;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF(MODEL_URL);

  const model = useMemo(() => {
    const root = scene.clone(true);
    preserveOriginalGlbMaterials(root);
    fitStandingModel(root);
    return root;
  }, [scene]);

  useEffect(() => {
    onReady();
  }, [onReady]);

  useFrame((_, delta) => {
    if (!rootRef.current) return;
    if (state !== "speaking") {
      rootRef.current.position.y = THREE.MathUtils.lerp(rootRef.current.position.y, 0, 0.18);
      return;
    }
    // Evita cortes por bobbing vertical cuando el icono habla.
    rootRef.current.position.y = THREE.MathUtils.lerp(rootRef.current.position.y, 0, 0.18);
  });

  return (
    <group ref={rootRef}>
      <primitive object={model} />
    </group>
  );
}

function OnniGlbScene({ state, onReady }: { state: OnniAvatarState; onReady: () => void }) {
  return (
    <>
      <ambientLight intensity={0.95} />
      <directionalLight position={[1.5, 3, 4]} intensity={1.15} color="#ffffff" />
      <directionalLight position={[-2, 1.5, 2]} intensity={0.45} color="#a5f3fc" />
      <pointLight position={[0, 1, 2.5]} intensity={0.4} color="#22d3ee" />
      <Bounds fit observe margin={1.6}>
        <OnniGlbModel state={state} onReady={onReady} />
      </Bounds>
    </>
  );
}

class GlbAvatarErrorBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("[OnniAvatarGlb] No se pudo cargar el modelo:", error);
    this.props.onError();
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

useGLTF.preload(MODEL_URL);

export default function OnniAvatarGlb({
  size = "md",
  state = "idle",
  className,
  title = "Onni",
}: OnniAvatarGlbProps) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <div
      className={cn("onni-glb-avatar relative shrink-0", sizeBox[size], className)}
      data-state={state}
      role="img"
      aria-label={title}
    >
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center rounded-full bg-cyan-400/15 text-[10px] font-semibold text-cyan-100 transition-opacity duration-500",
          ready ? "opacity-0" : "opacity-100",
        )}
      >
        Onni
      </div>

      <GlbAvatarErrorBoundary onError={() => setFailed(true)}>
        <Canvas
          className={cn(
            "onni-glb-avatar__canvas block h-full w-full transition-opacity duration-500",
            ready ? "opacity-100" : "opacity-0",
          )}
          camera={{ position: [0, 0.05, 3.2], fov: 30, near: 0.05, far: 50 }}
          gl={{ alpha: true, antialias: true, powerPreference: "default" }}
          style={{ width: "100%", height: "100%", display: "block" }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0);
            applyPixelRatioCap(gl);
          }}
          dpr={[1, 2]}
        >
          <Suspense
            fallback={
              <></>
            }
          >
            <OnniGlbScene state={state} onReady={() => setReady(true)} />
          </Suspense>
        </Canvas>
      </GlbAvatarErrorBoundary>
      {failed ? (
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-cyan-400/15 text-[10px] font-semibold text-cyan-100">
          Onni
        </div>
      ) : null}
    </div>
  );
}
