/** Ancho máximo base de cada marco de pantalla en Mega Cine (px), antes de escala global. */
const MEGA_CINE_SCREEN_BASE_RAW_PX = 340;

/** Escala de Pantalla 2 (eventos) respecto a la base. */
export const MEGA_CINE_SCREEN_TWO_SCALE = 1.3;

/** Escala global del layout (−30% = 0.7). */
export const MEGA_CINE_LAYOUT_SCALE = 0.7;

export const MEGA_CINE_SCREEN_BASE_MAX_PX = Math.round(
  MEGA_CINE_SCREEN_BASE_RAW_PX * MEGA_CINE_LAYOUT_SCALE,
);

export const MEGA_CINE_SCREEN_TWO_MAX_PX = Math.round(
  MEGA_CINE_SCREEN_BASE_RAW_PX * MEGA_CINE_SCREEN_TWO_SCALE * MEGA_CINE_LAYOUT_SCALE,
);

/** Ancho máximo de la columna apilada (pantallas 2 + 3). */
export const MEGA_CINE_STACK_MAX_PX = Math.round(460 * MEGA_CINE_LAYOUT_SCALE);

/** Separación entre Pantalla 2 y Pantalla 3. */
export const MEGA_CINE_SCREEN_STACK_GAP_MM = 5;

/** Desplazamiento hacia abajo de Pantalla 2 en la sala. */
export const MEGA_CINE_SCREEN_TWO_OFFSET_TOP_MM = 14;
