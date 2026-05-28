/** Panorama equirectangular del interior del Coliseo (public/coliseo.jpg). */
export const COLOSSEO_PANORAMA = "/coliseo.jpg";

export const COLOSSEO_PATH = "/coliseo";

/** URL absoluta para Cine / Cine Cam (WebView nativo en Android). */
export const COLOSSEO_PUBLIC_URL = "https://onnivers.com/coliseo";

export const COLOSSEO_SCENE_TITLE = "Coliseo Romano";
export const COLOSSEO_SCENE_SUBTITLE = "Sala 360°";

/** Página principal de YouTube en el WebView nativo. */
export const COLOSSEO_HOME_URL = "https://www.youtube.com/";

/** Shell same-origin para cargar YouTube en el iframe (sin sandbox restrictivo). */
export function coliseoBrowserFrameSrc(url: string = COLOSSEO_HOME_URL): string {
  const q = new URLSearchParams({ url });
  return `/coliseo-youtube-browser.html?${q.toString()}`;
}

// ——— Pantalla flotante vacía (slot WebView Android) ———

export const COLOSSEO_FLOATING_SCREEN_SCALE = 0.86;

/** Posición del centro de la pantalla en el mundo 3D [x, y, z]. */
export const COLOSSEO_FLOATING_SCREEN_POSITION: [number, number, number] = [0, 1.4, -7.2];

/** Plano de referencia en unidades Three.js (ancho × alto). */
export const COLOSSEO_FLOATING_SCREEN_PLANE = {
  width: 6.2 * COLOSSEO_FLOATING_SCREEN_SCALE,
  height: 3.48 * COLOSSEO_FLOATING_SCREEN_SCALE,
} as const;

/** Factor `distanceFactor` del Html de drei. */
export const COLOSSEO_FLOATING_SCREEN_HTML_DISTANCE = 10.5 * COLOSSEO_FLOATING_SCREEN_SCALE;

/** Tamaño del slot HTML en píxeles (referencia; Android lee el rect real en runtime). */
export const COLOSSEO_FLOATING_SCREEN_SLOT_PX = {
  maxWidth: Math.round(720 * COLOSSEO_FLOATING_SCREEN_SCALE),
  maxHeight: Math.round(340 * COLOSSEO_FLOATING_SCREEN_SCALE),
  widthVw: 88 * COLOSSEO_FLOATING_SCREEN_SCALE,
  heightVh: 42,
} as const;

/**
 * Coordenadas para Android (`MainActivity.updateColiseoBrowserBounds`).
 *
 * No son valores fijos en px: el WebView se alinea al elemento DOM
 * `#coliseo-browser-screen` (id {@link COLOSSEO_NATIVE_BROWSER_SLOT_ID} en coliseoNativeWebView.ts).
 *
 * En el WebView principal de Capacitor, ejecutar:
 * `window.__onniversoGetColiseoBrowserRect()`
 * → `{ x, y, w, h }` (píxeles, esquina superior izquierda del slot).
 *
 * Referencia 3D (mismo layout que el lobby Pantalla 2):
 * - position: COLOSSEO_FLOATING_SCREEN_POSITION
 * - plane: COLOSSEO_FLOATING_SCREEN_PLANE.width × height
 * - slot CSS: min(88vw×scale, 619px) × min(42vh, 292px) aprox.
 */
export const COLOSSEO_ANDROID_WEBVIEW_COORDS = {
  domSlotId: "coliseo-browser-screen",
  jsRectGetter: "__onniversoGetColiseoBrowserRect",
  androidBridge: {
    show: "window.Android.showColiseoBrowserWebView()",
    hide: "window.Android.hideColiseoBrowserWebView()",
    syncBounds: "window.Android.updateColiseoBrowserBounds()",
    loadUrl: "window.Android.loadColiseoBrowserUrl(url)",
  },
  world3d: {
    position: COLOSSEO_FLOATING_SCREEN_POSITION,
    planeWidth: COLOSSEO_FLOATING_SCREEN_PLANE.width,
    planeHeight: COLOSSEO_FLOATING_SCREEN_PLANE.height,
    htmlDistanceFactor: COLOSSEO_FLOATING_SCREEN_HTML_DISTANCE,
  },
  slotPxReference: COLOSSEO_FLOATING_SCREEN_SLOT_PX,
} as const;
