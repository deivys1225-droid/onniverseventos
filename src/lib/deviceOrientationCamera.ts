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

export function readScreenOrientationDeg(): number {
  if (typeof window === "undefined") return 0;
  const fromApi = window.screen?.orientation?.angle;
  if (typeof fromApi === "number") return fromApi;
  const legacy = (window as unknown as { orientation?: number }).orientation;
  return typeof legacy === "number" ? legacy : 0;
}

export type LobbyPilotRole = "master" | "slave";

/** Pantalla partida en Android: ?role=master|slave */
export function parseLobbyPilotRole(search?: string): LobbyPilotRole | null {
  if (typeof window === "undefined" && search == null) return null;
  const params = new URLSearchParams(search ?? window.location.search);
  const role = params.get("role")?.trim().toLowerCase();
  if (role === "master" || role === "slave") return role;
  return null;
}

export function isLobbySplitScreenRole(search?: string): boolean {
  return parseLobbyPilotRole(search) !== null;
}

/** Duplica sensibilidad yaw/alpha respecto al primer valor (compensa viewport al 50%). */
export function amplifyYawAlphaDeg(
  originAlphaDeg: number,
  currentAlphaDeg: number,
  sensitivity: number,
): number {
  if (sensitivity === 1) return currentAlphaDeg;
  let delta = currentAlphaDeg - originAlphaDeg;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  let amplified = originAlphaDeg + delta * sensitivity;
  while (amplified >= 360) amplified -= 360;
  while (amplified < 0) amplified += 360;
  return amplified;
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
