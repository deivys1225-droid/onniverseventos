import { isAndroidLiveStreamChoicePlatform } from "@/lib/liveStreamOpenDirect";
import { toast } from "sonner";

/** @deprecated Solo compatibilidad de firma; Android abre AulaVirtualActivity. */
export type Model3DDirectAction = "OPEN_MODEL_3D" | "OPEN_MODEL_INMERSIVO";

export type Model3DChoicePayload = {
  glbUrl: string;
  title: string;
};

export function isGlbModelUrl(modelUrl: string): boolean {
  const t = modelUrl.trim().toLowerCase();
  return t.includes(".glb");
}

/** URL .glb absoluta (local /assets o https Cloudinary). */
export function resolveAbsoluteGlbUrl(modelUrl: string): string {
  const t = modelUrl.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  if (typeof window !== "undefined") {
    return new URL(t, window.location.origin).href;
  }
  return t;
}

export function buildModel3DChoicePayload(model: {
  modelUrl: string;
  title: string;
}): Model3DChoicePayload | null {
  if (!isGlbModelUrl(model.modelUrl)) return null;
  const glbUrl = resolveAbsoluteGlbUrl(model.modelUrl);
  if (!glbUrl) return null;
  return { glbUrl, title: model.title.trim() || "Modelo 3D" };
}

/**
 * Puente Android (tarjeta Aula / selector de modelo .glb):
 * {@code openModelDirect} → AulaVirtualActivity.
 */
export function invokeOpenModelDirect(
  _glbUrl = "",
  _action: Model3DDirectAction = "OPEN_MODEL_3D",
): boolean {
  if (typeof window.AndroidBridge?.openModelDirect === "function") {
    window.AndroidBridge.openModelDirect("", "");
    return true;
  }
  toast.error("AndroidBridge.openModelDirect no disponible.");
  return false;
}

/** Solo tarjetas .glb en galería (selector de visor), no la tarjeta promocional de Aula. */
export function shouldHandoffModel3DOnAndroid(modelUrl: string): boolean {
  return isGlbModelUrl(modelUrl) && isAndroidLiveStreamChoicePlatform();
}
