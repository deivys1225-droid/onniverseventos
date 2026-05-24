import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Quaternion } from "three";
import {
  angleDeltaDeg,
  applyDeviceOrientationToCamera,
  computeCalibratedCameraQuaternion,
  lerpAngleDeg,
  readScreenOrientationDeg,
} from "@/lib/deviceOrientationCamera";

/** Suavizado de la cámara: más bajo = menos temblor, más inercia al girar. */
const HEAD_SMOOTHING_RATE_HZ = 1.55;
/** Filtro del sensor en reposo (Hz). */
const SENSOR_FILTER_REST_HZ = 1.1;
/** Filtro del sensor en giro moderado (Hz). */
const SENSOR_FILTER_MOVE_HZ = 3.8;
/** Filtro del sensor en giro rápido (Hz). */
const SENSOR_FILTER_FAST_HZ = 5.5;
/** Por debajo de esto (°) el teléfono se considera quieto y se ignora ruido del sensor. */
const STILLNESS_THRESHOLD_DEG = 1.35;
/** Giro moderado / rápido para subir la respuesta del filtro (°). */
const MOTION_MODERATE_DEG = 2.6;
const MOTION_FAST_DEG = 7.5;

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
  /** Incrementar para recalibrar sin desactivar el giro (p. ej. mantener pulsado GIRO). */
  recenterToken?: number;
};

/**
 * Mirada con giroscopio calibrada: al activar conserva la vista actual y aplica
 * solo el movimiento relativo del sensor (evita saltar 180° hacia las pantallas).
 */
export default function LobbyDeviceOrientationLook({
  enabled,
  recenterToken = 0,
}: LobbyDeviceOrientationLookProps) {
  const { camera } = useThree();
  const orientationRef = useRef<DeviceOrientationEvent | null>(null);
  const filteredOrientationRef = useRef<FilteredOrientation | null>(null);
  const targetQuatRef = useRef(new Quaternion());
  const refCameraQuatRef = useRef(new Quaternion());
  const refDeviceQuatRef = useRef(new Quaternion());
  const calibratedRef = useRef(false);

  const resetCalibration = () => {
    calibratedRef.current = false;
    filteredOrientationRef.current = null;
    orientationRef.current = null;
  };

  useEffect(() => {
    if (!enabled) {
      resetCalibration();
      return;
    }

    camera.rotation.reorder("YXZ");
    resetCalibration();

    const onOrientation = (event: DeviceOrientationEvent) => {
      orientationRef.current = event;
    };
    window.addEventListener("deviceorientation", onOrientation, true);

    return () => {
      window.removeEventListener("deviceorientation", onOrientation, true);
      resetCalibration();
    };
  }, [camera, enabled]);

  useEffect(() => {
    if (!enabled || recenterToken === 0) return;
    resetCalibration();
  }, [enabled, recenterToken]);

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
    const screenDeg = readScreenOrientationDeg();

    if (!calibratedRef.current) {
      refCameraQuatRef.current.copy(camera.quaternion);
      applyDeviceOrientationToCamera(
        refDeviceQuatRef.current,
        filtered.alpha,
        filtered.beta,
        filtered.gamma,
        screenDeg,
      );
      calibratedRef.current = true;
      return;
    }

    computeCalibratedCameraQuaternion(
      targetQuatRef.current,
      refCameraQuatRef.current,
      refDeviceQuatRef.current,
      filtered.alpha,
      filtered.beta,
      filtered.gamma,
      screenDeg,
    );

    const factor = 1 - Math.exp(-HEAD_SMOOTHING_RATE_HZ * delta);
    camera.quaternion.slerp(targetQuatRef.current, factor);
  });

  return null;
}
