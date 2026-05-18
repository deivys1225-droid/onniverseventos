import type { ReactNode } from "react";

/** Contenedor legacy; la cámara de fondo en móvil fue retirada. */
export function CameraBackgroundProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
