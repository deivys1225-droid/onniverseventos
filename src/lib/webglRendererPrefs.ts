import type { WebGLRenderer } from "three";

/** Never exceed 2 — high-DPR phones burn GPU on fullscreen fills. */
export const MAX_WEBGL_PIXEL_RATIO = 2;

/** Geometry segments for VR-style spheres where detail is imperceptible vs cost. */
export const OPTIMIZED_SPHERE_SEGMENTS = 32;

/** Stereo / immersive VR (double render): prioritize FPS — fixed 1:1 pixels. */
export const VR_STEREO_PIXEL_RATIO = 1;

/** Half segment count vs OPTIMIZED_SPHERE_SEGMENTS while stereo VR is active. */
export function getAdaptiveSphereSegments(vrStereo: boolean): number {
  if (!vrStereo) return OPTIMIZED_SPHERE_SEGMENTS;
  return Math.max(8, Math.floor(OPTIMIZED_SPHERE_SEGMENTS / 2));
}

export function isMobileCoarseDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  if (/android|iphone|ipad|ipod/i.test(navigator.userAgent)) return true;
  if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) return true;
  return false;
}

/** Ratón USB/Bluetooth en teléfono o tablet. */
export function hasFinePointerInput(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(pointer: fine)").matches ||
    window.matchMedia("(any-pointer: fine)").matches
  );
}

/** PC: pointer-lock. Móvil con ratón: igual que PC; solo táctil: arrastre en canvas. */
export function lobbyUsesPointerLockControls(): boolean {
  if (!isMobileCoarseDevice()) return true;
  return hasFinePointerInput();
}

export function applyPixelRatioCap(gl: WebGLRenderer): void {
  gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_WEBGL_PIXEL_RATIO));
}
