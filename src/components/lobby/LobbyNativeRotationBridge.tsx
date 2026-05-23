import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { MathUtils } from "three";
import { readNativeRotationTarget } from "@/lib/lobbyNativePilot";

/** Suavizado tipo VR (Hz); más alto = más pegado al sensor nativo. */
const NATIVE_ROTATION_SMOOTHING_HZ = 12;
const PITCH_CLAMP_RAD = 1.35;

type LobbyNativeRotationBridgeProps = {
  enabled: boolean;
};

/**
 * Aplica rotación inyectada por Android ({@code window.updateNativeRotation})
 * con interpolación exponencial sobre Euler YXZ (viewport único, sin estéreo).
 */
export default function LobbyNativeRotationBridge({ enabled }: LobbyNativeRotationBridgeProps) {
  const { camera } = useThree();
  const snappedRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      snappedRef.current = false;
      return;
    }
    camera.rotation.reorder("YXZ");
    snappedRef.current = false;
  }, [camera, enabled]);

  useFrame((_, delta) => {
    if (!enabled) return;

    const target = readNativeRotationTarget();
    if (!target.dirty) return;

    const targetX = MathUtils.degToRad(target.pitch);
    const targetY = MathUtils.degToRad(target.yaw);
    const targetZ = MathUtils.degToRad(target.roll);
    const clampedX = MathUtils.clamp(targetX, -PITCH_CLAMP_RAD, PITCH_CLAMP_RAD);

    if (!snappedRef.current) {
      camera.rotation.set(clampedX, targetY, targetZ);
      snappedRef.current = true;
      return;
    }

    const factor = 1 - Math.exp(-NATIVE_ROTATION_SMOOTHING_HZ * delta);
    camera.rotation.x += (clampedX - camera.rotation.x) * factor;
    camera.rotation.y += (targetY - camera.rotation.y) * factor;
    camera.rotation.z += (targetZ - camera.rotation.z) * factor;
  });

  return null;
}
