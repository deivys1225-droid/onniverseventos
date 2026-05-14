import { useEffect, useState } from "react";

/**
 * True cuando `document.body` tiene la clase `vr-mode-active` (reservado;
 * el modo espejo SBS ya no se usa en la app).
 */
export function useVrModeActive(): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const sync = () => setActive(document.body.classList.contains("vr-mode-active"));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  return active;
}
