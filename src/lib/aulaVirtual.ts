import { isAndroidLiveStreamChoicePlatform } from "@/lib/liveStreamOpenDirect";
import { invokeOpenModelDirect } from "@/lib/model3dOpenDirect";

/** Sección Galería / Aula en la web (botón del menú navbar). */
export const GALERIA_AULA_SECTION_PATH = "/3d";

/** Ancla de la tarjeta promocional dentro de {@link GALERIA_AULA_SECTION_PATH}. */
export const GALERIA_AULA_CARD_HASH = "aula-virtual-card";

export const GALERIA_AULA_SECTION_HREF = `${GALERIA_AULA_SECTION_PATH}#${GALERIA_AULA_CARD_HASH}`;

/** Lobby 3D caminable en navegador (botón de la tarjeta en web). */
export const AULA_VIRTUAL_LOBBY_PATH = "/aula-virtual";

/** URL cargada por {@code AulaVirtualActivity} en Android. */
export const AULA_VIRTUAL_PRODUCTION_URL = "https://onnivers.com/aula-virtual";

/** Pared web del aula 3D (iframe casi a tamaño completo en la pared del fondo). */
export const AULA_VIRTUAL_MAIN_WALL_URL = "https://onnivers.com/";

/** @deprecated Usar {@link GALERIA_AULA_SECTION_PATH} o {@link AULA_VIRTUAL_LOBBY_PATH}. */
export const AULA_VIRTUAL_PATH = AULA_VIRTUAL_LOBBY_PATH;

/**
 * Tarjeta «Entrar al Aula Virtual» en APK: lobby estéreo nativo
 * ({@code openModelDirect} → AulaVirtualActivity).
 */
export function openAulaVirtualLobbyOnAndroid(): boolean {
  if (!isAndroidLiveStreamChoicePlatform()) return false;
  return invokeOpenModelDirect();
}

/** Alias legado del nombre anterior. */
export function openAulaVirtualOnAndroid(): boolean {
  return openAulaVirtualLobbyOnAndroid();
}
