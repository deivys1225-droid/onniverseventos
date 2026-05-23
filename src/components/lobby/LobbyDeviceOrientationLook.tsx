import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { MathUtils, Quaternion } from "three";
import {
  applyDeviceOrientationToCamera,
  readScreenOrientationDeg,
} from "@/lib/deviceOrientationCamera";

/** Más bajo = menos temblor en reposo; un poco más de inercia al girar. */
const HEAD_SMOOTHING_RATE_HZ = 6;
/** Ignora microcambios del sensor cuando el teléfono está casi quieto. */
const ORIENTATION_DEADZONE_RAD = MathUtils.degToRad(0.45);

type LobbyDeviceOrientationLookProps = {
  enabled: boolean;
};

/**
 * Mirada con giroscopio en un solo viewport (sin StereoEffect ni pantalla partida).
 */
export default function LobbyDeviceOrientationLook({ enabled }: LobbyDeviceOrientationLookProps) {
  const { camera } = useThree();
  const orientationRef = useRef<DeviceOrientationEvent | null>(null);
  const rawTargetQuatRef = useRef(new Quaternion());
  const stableTargetQuatRef = useRef(new Quaternion());
  const isFirstFrameRef = useRef(true);

  useEffect(() => {
    if (!enabled) {
      orientationRef.current = null;
      return;
    }

    camera.rotation.reorder("YXZ");
    isFirstFrameRef.current = true;

    const onOrientation = (event: DeviceOrientationEvent) => {
      orientationRef.current = event;
    };
    window.addEventListener("deviceorientation", onOrientation, true);

    return () => {
      window.removeEventListener("deviceorientation", onOrientation, true);
      orientationRef.current = null;
    };
  }, [camera, enabled]);

  useFrame((_, delta) => {
    if (!enabled) return;

    const evt = orientationRef.current;
    if (evt?.alpha == null || evt.beta == null || evt.gamma == null) return;

    applyDeviceOrientationToCamera(
      rawTargetQuatRef.current,
      evt.alpha,
      evt.beta,
      evt.gamma,
      readScreenOrientationDeg(),
    );

    if (isFirstFrameRef.current) {
      stableTargetQuatRef.current.copy(rawTargetQuatRef.current);
      camera.quaternion.copy(stableTargetQuatRef.current);
      isFirstFrameRef.current = false;
      return;
    }

    const deltaAngle = stableTargetQuatRef.current.angleTo(rawTargetQuatRef.current);
    if (deltaAngle >= ORIENTATION_DEADZONE_RAD) {
      stableTargetQuatRef.current.copy(rawTargetQuatRef.current);
    }

    const factor = 1 - Math.exp(-HEAD_SMOOTHING_RATE_HZ * delta);
    camera.quaternion.slerp(stableTargetQuatRef.current, factor);
  });

  return null;
}
