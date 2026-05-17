/** Ancho máximo base de cada marco de pantalla en Mega Cine (px). */
export const MEGA_CINE_SCREEN_BASE_MAX_PX = 340;

/** Escala de Pantalla 2 (eventos) respecto a la base. Actual: +30%. */
export const MEGA_CINE_SCREEN_TWO_SCALE = 1.3;

export const MEGA_CINE_SCREEN_TWO_MAX_PX = Math.round(
  MEGA_CINE_SCREEN_BASE_MAX_PX * MEGA_CINE_SCREEN_TWO_SCALE,
);
