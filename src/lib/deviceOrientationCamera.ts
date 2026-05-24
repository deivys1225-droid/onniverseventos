import { Euler, MathUtils, Quaternion, Vector3 } from "three";

const Z_AXIS = new Vector3(0, 0, 1);

/**
 * Orientación del dispositivo → quaternion de cámara (réplica de DeviceOrientationControls).
 */
export function applyDeviceOrientationToCamera(
  quaternion: Quaternion,
  alphaDeg: number,
  betaDeg: number,
  gammaDeg: number,
  screenOrientationDeg: number,
): void {
  const alpha = MathUtils.degToRad(alphaDeg);
  const beta = MathUtils.degToRad(betaDeg);
  const gamma = MathUtils.degToRad(gammaDeg);
  const orient = MathUtils.degToRad(screenOrientationDeg);

  const euler = new Euler(beta, alpha, -gamma, "YXZ");
  quaternion.setFromEuler(euler);
  quaternion.multiply(new Quaternion(-Math.SQRT1_2, 0, 0, Math.SQRT1_2));
  quaternion.multiply(new Quaternion().setFromAxisAngle(Z_AXIS, -orient));
}

const _scratchDeviceQuat = new Quaternion();
const _scratchInvRefDevice = new Quaternion();
const _scratchDeltaQuat = new Quaternion();

/**
 * Orientación de cámara calibrada: aplica solo el delta del sensor desde el momento
 * de calibración, preservando hacia dónde miraba el usuario al activar el giro.
 */
export function computeCalibratedCameraQuaternion(
  out: Quaternion,
  refCamera: Quaternion,
  refDevice: Quaternion,
  alphaDeg: number,
  betaDeg: number,
  gammaDeg: number,
  screenOrientationDeg: number,
): void {
  applyDeviceOrientationToCamera(
    _scratchDeviceQuat,
    alphaDeg,
    betaDeg,
    gammaDeg,
    screenOrientationDeg,
  );
  _scratchInvRefDevice.copy(refDevice).invert();
  _scratchDeltaQuat.copy(_scratchInvRefDevice).multiply(_scratchDeviceQuat);
  out.copy(refCamera).multiply(_scratchDeltaQuat);
}

export function readScreenOrientationDeg(): number {
  if (typeof window === "undefined") return 0;
  const fromApi = window.screen?.orientation?.angle;
  if (typeof fromApi === "number") return fromApi;
  const legacy = (window as unknown as { orientation?: number }).orientation;
  return typeof legacy === "number" ? legacy : 0;
}

/** Diferencia angular mínima entre dos ángulos en grados (0–360). */
export function angleDeltaDeg(fromDeg: number, toDeg: number): number {
  let delta = toDeg - fromDeg;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  return Math.abs(delta);
}

/** Interpolación exponencial entre ángulos en grados (0–360). */
export function lerpAngleDeg(fromDeg: number, toDeg: number, t: number): number {
  let delta = toDeg - fromDeg;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  let result = fromDeg + delta * t;
  while (result >= 360) result -= 360;
  while (result < 0) result += 360;
  return result;
}

type DeviceOrientationEventCtor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

/** iOS 13+: permiso desde un gesto de usuario. Android WebView suele no requerirlo. */
export async function requestDeviceOrientationPermission(): Promise<"granted" | "unsupported" | "denied"> {
  if (typeof window === "undefined" || typeof DeviceOrientationEvent === "undefined") {
    return "unsupported";
  }
  const Doe = DeviceOrientationEvent as DeviceOrientationEventCtor;
  if (!Doe.requestPermission) return "granted";
  try {
    const result = await Doe.requestPermission();
    return result === "granted" ? "granted" : "denied";
  } catch {
    return "denied";
  }
}
