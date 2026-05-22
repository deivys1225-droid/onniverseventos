import { isAndroidLiveStreamChoicePlatform } from "@/lib/liveStreamOpenDirect";
import { toast } from "sonner";

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

export function invokeOpenModelDirect(glbUrl: string, action: Model3DDirectAction): boolean {
  if (typeof window.AndroidBridge?.openModelDirect === "function") {
    window.AndroidBridge.openModelDirect(glbUrl, action);
    return true;
  }
  toast.error("AndroidBridge.openModelDirect no disponible.");
  return false;
}

/** Galería 3D en APK: modal de visor, sin AR legacy ni espectador. */
export function shouldHandoffModel3DOnAndroid(modelUrl: string): boolean {
  return isGlbModelUrl(modelUrl) && isAndroidLiveStreamChoicePlatform();
}
