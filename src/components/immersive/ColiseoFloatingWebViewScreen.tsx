import { Html } from "@react-three/drei";
import ColiseoAndroidWebViewSlot from "@/components/immersive/ColiseoBrowserPanel";
import {
  COLOSSEO_FLOATING_SCREEN_HTML_DISTANCE,
  COLOSSEO_FLOATING_SCREEN_PLANE,
  COLOSSEO_FLOATING_SCREEN_POSITION,
  COLOSSEO_FLOATING_SCREEN_SLOT_PX,
} from "@/data/coliseoScene";

/** Pantalla flotante vacía en la escena 3D; Android pinta el WebView encima del slot. */
export default function ColiseoFloatingWebViewScreen({
  onScreenPointerDown,
}: {
  onScreenPointerDown?: () => void;
}) {
  return (
    <group position={COLOSSEO_FLOATING_SCREEN_POSITION}>
      <Html
        transform
        distanceFactor={COLOSSEO_FLOATING_SCREEN_HTML_DISTANCE}
        center
        zIndexRange={[50, 51]}
        style={{
          width: `min(${COLOSSEO_FLOATING_SCREEN_SLOT_PX.widthVw}vw, ${COLOSSEO_FLOATING_SCREEN_SLOT_PX.maxWidth}px)`,
          pointerEvents: "auto",
        }}
      >
        <div
          className="relative"
          style={{ height: `min(${COLOSSEO_FLOATING_SCREEN_SLOT_PX.heightVh}vh, ${COLOSSEO_FLOATING_SCREEN_SLOT_PX.maxHeight}px)` }}
        >
          <div className="h-full overflow-hidden rounded-lg border border-white/25 bg-transparent shadow-[0_0_40px_rgba(0,0,0,0.45)] ring-1 ring-amber-400/25">
            <ColiseoAndroidWebViewSlot onScreenPointerDown={onScreenPointerDown} />
          </div>
        </div>
      </Html>

      {/* Plano invisible de referencia (misma huella que la pantalla). */}
      <mesh raycast={() => null}>
        <planeGeometry args={[COLOSSEO_FLOATING_SCREEN_PLANE.width, COLOSSEO_FLOATING_SCREEN_PLANE.height]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}
