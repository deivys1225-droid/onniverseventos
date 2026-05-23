import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { MathUtils, Quaternion } from "three";
import {
  amplifyYawAlphaDeg,
  applyDeviceOrientationToCamera,
  isLobbySplitScreenRole,
  readScreenOrientationDeg,
} from "@/lib/deviceOrientationCamera";

/** Más bajo = menos temblor en reposo; un poco más de inercia al girar. */
const HEAD_SMOOTHING_RATE_HZ = 6;
/** Ignora microcambios del sensor cuando el teléfono está casi quieto. */
const ORIENTATION_DEADZONE_RAD = MathUtils.degToRad(0.45);
/** Compensa viewport al 50% en Android (role=master|slave). */
const SPLIT_SCREEN_YAW_SENSITIVITY = 2;

type LobbyDeviceOrientationLookProps = {
  enabled: boolean;
};

/**
 * Mirada con giroscopio en un solo viewport (sin StereoEffect ni pantalla partida).
 */
export default function LobbyDeviceOrientationLook({ enabled }: LobbyDeviceOrientationLookProps) {
  const { camera } = useThree();
  const yawSensitivity = useMemo(
    () => (isLobbySplitScreenRole() ? SPLIT_SCREEN_YAW_SENSITIVITY : 1),
    [],
  );
  const orientationRef = useRef<DeviceOrientationEvent | null>(null);
  const yawAlphaOriginRef = useRef<number | null>(null);
  const rawTargetQuatRef = useRef(new Quaternion());
  const stableTargetQuatRef = useRef(new Quaternion());
  const isFirstFrameRef = useRef(true);

  useEffect(() => {
    if (!enabled) {
      orientationRef.current = null;
      yawAlphaOriginRef.current = null;
      return;
    }

    camera.rotation.reorder("YXZ");
    isFirstFrameRef.current = true;
    yawAlphaOriginRef.current = null;

    const onOrientation = (event: DeviceOrientationEvent) => {
      orientationRef.current = event;
    };
    window.addEventListener("deviceorientation", onOrientation, true);

    return () => {
      window.removeEventListener("deviceorientation", onOrientation, true);
      orientationRef.current = null;
      yawAlphaOriginRef.current = null;
    };
  }, [camera, enabled]);

  useFrame((_, delta) => {
    if (!enabled) return;

    const evt = orientationRef.current;
    if (evt?.alpha == null || evt.beta == null || evt.gamma == null) return;

    if (yawSensitivity !== 1 && yawAlphaOriginRef.current === null) {
      yawAlphaOriginRef.current = evt.alpha;
    }

    const alphaDeg =
      yawSensitivity !== 1 && yawAlphaOriginRef.current !== null
        ? amplifyYawAlphaDeg(yawAlphaOriginRef.current, evt.alpha, yawSensitivity)
        : evt.alpha;

    applyDeviceOrientationToCamera(
      rawTargetQuatRef.current,
      alphaDeg,
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
