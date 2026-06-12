import { Capacitor } from "@capacitor/core";
import { buildAgoraChannel } from "@/lib/agoraRooms";

/** Abre URL de producto inmersivo (sin visor GLB local). */
export function openImmersiveModel(modelUrl: string, title: string) {
  if (Capacitor.getPlatform() === "android") {
    const params = new URLSearchParams();
    params.set("mp4", modelUrl);
    params.set("title", title);
    params.set("mode", "vod");
    const path = `/sala/espectador/${encodeURIComponent(buildAgoraChannel("main"))}?${params.toString()}`;
    window.location.assign(`${window.location.origin}${path}`);
    return;
  }
  window.open(modelUrl, "_blank", "noopener,noreferrer");
}
