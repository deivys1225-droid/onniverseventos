import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { MathUtils, Quaternion } from "three";
import {
  angleDeltaDeg,
  applyDeviceOrientationToCamera,
  lerpAngleDeg,
  readScreenOrientationDeg,
} from "@/lib/deviceOrientationCamera";

/** Suavizado de la cámara: más bajo = menos temblor, más inercia al girar. */
const HEAD_SMOOTHING_RATE_HZ = 2.4;
/** Filtro del sensor en reposo (Hz). */
const SENSOR_FILTER_REST_HZ = 1.6;
/** Filtro del sensor en giro moderado (Hz). */
const SENSOR_FILTER_MOVE_HZ = 5.5;
/** Filtro del sensor en giro rápido (Hz). */
const SENSOR_FILTER_FAST_HZ = 9;
/** Por debajo de esto (°) el teléfono se considera quieto y se ignora ruido del sensor. */
const STILLNESS_THRESHOLD_DEG = 0.75;
/** Giro moderado / rápido para subir la respuesta del filtro (°). */
const MOTION_MODERATE_DEG = 1.8;
const MOTION_FAST_DEG = 5.5;

type FilteredOrientation = {
  alpha: number;
  beta: number;
  gamma: number;
};

function sensorFilterHz(motionDeg: number): number {
  if (motionDeg >= MOTION_FAST_DEG) return SENSOR_FILTER_FAST_HZ;
  if (motionDeg >= MOTION_MODERATE_DEG) return SENSOR_FILTER_MOVE_HZ;
  return SENSOR_FILTER_REST_HZ;
}

function maxOrientationMotionDeg(
  filtered: FilteredOrientation,
  alpha: number,
  beta: number,
  gamma: number,
): number {
  return Math.max(
    angleDeltaDeg(filtered.alpha, alpha),
    Math.abs(filtered.beta - beta),
    Math.abs(filtered.gamma - gamma),
  );
}

type LobbyDeviceOrientationLookProps = {
  enabled: boolean;
};

/**
 * Mirada con giroscopio en un solo viewport (sin StereoEffect ni pantalla partida).
 */
export default function LobbyDeviceOrientationLook({ enabled }: LobbyDeviceOrientationLookProps) {
  const { camera } = useThree();
  const orientationRef = useRef<DeviceOrientationEvent | null>(null);
  const filteredOrientationRef = useRef<FilteredOrientation | null>(null);
  const targetQuatRef = useRef(new Quaternion());
  const isFirstFrameRef = useRef(true);

  useEffect(() => {
    if (!enabled) {
      orientationRef.current = null;
      filteredOrientationRef.current = null;
      return;
    }

    camera.rotation.reorder("YXZ");
    isFirstFrameRef.current = true;
    filteredOrientationRef.current = null;

    const onOrientation = (event: DeviceOrientationEvent) => {
      orientationRef.current = event;
    };
    window.addEventListener("deviceorientation", onOrientation, true);

    return () => {
      window.removeEventListener("deviceorientation", onOrientation, true);
      orientationRef.current = null;
      filteredOrientationRef.current = null;
    };
  }, [camera, enabled]);

  useFrame((_, delta) => {
    if (!enabled) return;

    const evt = orientationRef.current;
    if (evt?.alpha == null || evt.beta == null || evt.gamma == null) return;

    const rawAlpha = evt.alpha;
    const rawBeta = evt.beta;
    const rawGamma = evt.gamma;

    if (filteredOrientationRef.current === null) {
      filteredOrientationRef.current = {
        alpha: rawAlpha,
        beta: rawBeta,
        gamma: rawGamma,
      };
    } else {
      const filtered = filteredOrientationRef.current;
      const motionDeg = maxOrientationMotionDeg(filtered, rawAlpha, rawBeta, rawGamma);

      if (motionDeg >= STILLNESS_THRESHOLD_DEG) {
        const sensorFactor = 1 - Math.exp(-sensorFilterHz(motionDeg) * delta);
        filtered.alpha = lerpAngleDeg(filtered.alpha, rawAlpha, sensorFactor);
        filtered.beta += (rawBeta - filtered.beta) * sensorFactor;
        filtered.gamma += (rawGamma - filtered.gamma) * sensorFactor;
      }
    }

    const filtered = filteredOrientationRef.current;
    applyDeviceOrientationToCamera(
      targetQuatRef.current,
      filtered.alpha,
      filtered.beta,
      filtered.gamma,
      readScreenOrientationDeg(),
    );

    if (isFirstFrameRef.current) {
      camera.quaternion.copy(targetQuatRef.current);
      isFirstFrameRef.current = false;
      return;
    }

    const factor = 1 - Math.exp(-HEAD_SMOOTHING_RATE_HZ * delta);
    camera.quaternion.slerp(targetQuatRef.current, factor);
  });

  return null;
}
