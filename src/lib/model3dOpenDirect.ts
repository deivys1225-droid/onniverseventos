import { isAndroidLiveStreamChoicePlatform } from "@/lib/liveStreamOpenDirect";
import { toast } from "sonner";

/** @deprecated Solo compatibilidad de firma; Android abre siempre Aula Virtual nativa. */
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
 * Puente Android: {@code openModelDirect} → AulaVirtualActivity (estéreo, un WebView).
 * Los argumentos legacy se envían vacíos; el nativo ignora URL .glb y visores antiguos.
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

/** En APK: cualquier tarjeta de galería abre Aula Virtual nativa (no visores .glb). */
export function shouldHandoffModel3DOnAndroid(_modelUrl?: string): boolean {
  return isAndroidLiveStreamChoicePlatform();
}
