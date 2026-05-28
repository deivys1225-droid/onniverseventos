/** Panorama equirectangular del interior del Coliseo (public/coliseo.jpg). */
export const COLOSSEO_PANORAMA = "/coliseo.jpg";

export const COLOSSEO_PATH = "/coliseo";

export const COLOSSEO_SCENE_TITLE = "Coliseo Romano";
export const COLOSSEO_SCENE_SUBTITLE = "Sala 360°";

/** Página principal de YouTube en la pantalla flotante. */
export const COLOSSEO_HOME_URL = "https://www.youtube.com/";

/** Shell same-origin para cargar YouTube en el iframe (sin sandbox restrictivo). */
export function coliseoBrowserFrameSrc(url: string = COLOSSEO_HOME_URL): string {
  const q = new URLSearchParams({ url });
  return `/coliseo-youtube-browser.html?${q.toString()}`;
}

