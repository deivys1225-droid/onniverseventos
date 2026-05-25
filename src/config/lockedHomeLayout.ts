/**
 * DISEÑO BLOQUEADO — portada / Mi Mundo VR / barra superior / tarjeta de perfil.
 *
 * NO modificar constantes ni clases de este archivo sin autorización explícita del
 * product owner. Valores aprobados en producción (2026-05-18).
 */
export const LOCKED_HOME_LAYOUT_VERSION = "2026-05-18-v1" as const;

export const LOCKED_CENTRAL_SPHERE_RADIUS = 0.925;

/** Tierra + Luna en móvil: escala base 0.7; −10 % adicional → 0.63 vs desktop. */
export const LOCKED_EARTH_MOBILE_SCALE = 0.63;

/** Y de la esfera terrestre (independiente del punto de mira de la cámara). */
export const LOCKED_EARTH_SCENE_Y = {
  desktop: -LOCKED_CENTRAL_SPHERE_RADIUS * 7.02,
  /** +20 % más arriba que 6.02 (factor × 0.8). */
  mobile: -LOCKED_CENTRAL_SPHERE_RADIUS * 4.816,
} as const;

/** Punto de mira de la cámara (fijo; no acoplar al offset de la Tierra). */
export const LOCKED_CAMERA_ORBIT_TARGET_Y = {
  desktop: -3.645,
  mobile: -3.15,
} as const;

export const LOCKED_CAMERA_POSITION = {
  desktop: [0, -0.95, 6.85] as const,
  mobile: [0, -0.55, 6.4] as const,
};

export const LOCKED_CAMERA_FOV = {
  desktop: 62,
  mobile: 48,
} as const;

export const LOCKED_MOON = {
  orbitRadiusFactor: 1.8432,
  /** 0 = órbita en el ecuador (plano XZ), sin inclinación. */
  orbitTiltX: 0,
  /** 0 = sobre el ecuador; la órbita recorre todo el contorno ecuatorial. */
  meshY: 0,
} as const;

/** Wrapper de ProfileCard sobre el canvas 3D. */
export const LOCKED_PROFILE_CARD_WRAPPER_CLASS =
  "pointer-events-auto w-full max-w-[min(92vw,280px)] origin-bottom scale-x-[0.605] scale-y-[0.6655] -translate-y-[calc(clamp(2rem,11.2vh,5.2rem)+20.8%)] md:-translate-y-[calc(clamp(4.16rem,20vh,10.8rem)+20.8%)]";

/** Altura de la barra fija superior. */
export const LOCKED_NAVBAR_HEIGHT_CLASS = "h-12";
export const LOCKED_NAVBAR_MENU_OFFSET_CLASS = "top-12";
