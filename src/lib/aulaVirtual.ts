/** Rutas legacy del aula — desactivadas en depuración (solo Onni activo). */
export const GALERIA_AULA_SECTION_PATH = "/3d";
export const GALERIA_AULA_CARD_HASH = "aula-virtual-card";
export const GALERIA_AULA_SECTION_HREF = `${GALERIA_AULA_SECTION_PATH}#${GALERIA_AULA_CARD_HASH}`;
export const AULA_VIRTUAL_LOBBY_PATH = "/3d";
export const AULA_VIRTUAL_PRODUCTION_URL = "https://onnivers.online/3d";
export const AULA_VIRTUAL_MAIN_WALL_URL = "https://onnivers.online/";
export const AULA_VIRTUAL_PATH = AULA_VIRTUAL_LOBBY_PATH;

export function openAulaVirtualLobbyOnAndroid(): boolean {
  return false;
}

export function openAulaVirtualOnAndroid(): boolean {
  return false;
}
