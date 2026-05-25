import { isAndroidLiveStreamChoicePlatform } from "@/lib/liveStreamOpenDirect";
import { invokeOpenModelDirect } from "@/lib/model3dOpenDirect";

export const AULA_VIRTUAL_PATH = "/aula-virtual";

/** Misma ruta que {@link AulaVirtualActivity#AULA_VIRTUAL_URL} en Android. */
export const AULA_VIRTUAL_PRODUCTION_URL = "https://onnivers.com/aula-virtual";

/** APK: puente openModelDirect → Aula Virtual estéreo nativa. */
export function openAulaVirtualOnAndroid(): boolean {
  if (!isAndroidLiveStreamChoicePlatform()) return false;
  return invokeOpenModelDirect();
}
