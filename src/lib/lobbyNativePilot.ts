export type LobbyPilotRole = "master" | "slave";

export type NativeRotationDegrees = {
  yaw: number;
  pitch: number;
  roll: number;
  /** True después del primer updateNativeRotation recibido. */
  dirty: boolean;
};

const nativeRotationTarget: NativeRotationDegrees = {
  yaw: 0,
  pitch: 0,
  roll: 0,
  dirty: false,
};

/** Lee ?role=master|slave en lobby-inmersivo (piloto nativo Android). */
export function parseLobbyPilotRole(search?: string): LobbyPilotRole | null {
  if (typeof window === "undefined" && search == null) return null;
  const params = new URLSearchParams(search ?? window.location.search);
  const role = params.get("role")?.trim().toLowerCase();
  if (role === "master" || role === "slave") return role;
  return null;
}

export function isLobbyNativePilotActive(search?: string): boolean {
  return parseLobbyPilotRole(search) !== null;
}

/** Android → JS: {@code window.updateNativeRotation(yaw, pitch, roll)} (grados). */
export function setNativeRotationTarget(yaw: number, pitch: number, roll: number): void {
  nativeRotationTarget.yaw = yaw;
  nativeRotationTarget.pitch = pitch;
  nativeRotationTarget.roll = roll;
  nativeRotationTarget.dirty = true;
}

export function readNativeRotationTarget(): NativeRotationDegrees {
  return nativeRotationTarget;
}

export function registerNativeRotationGlobal(): void {
  if (typeof window === "undefined") return;
  window.updateNativeRotation = (yaw: number, pitch: number, roll: number) => {
    setNativeRotationTarget(yaw, pitch, roll);
  };
}

export function unregisterNativeRotationGlobal(): void {
  if (typeof window === "undefined") return;
  delete window.updateNativeRotation;
  nativeRotationTarget.dirty = false;
}

declare global {
  interface Window {
    /** Piloto nativo Android: yaw/pitch/roll en grados → cámara del lobby. */
    updateNativeRotation?: (yaw: number, pitch: number, roll: number) => void;
  }
}

export {};
