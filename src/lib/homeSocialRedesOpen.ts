/** Abre red social en modo Redes (VR). */
export function openHomeSocialRedes(url: string): void {
  const target = url.trim();
  if (!target) return;

  if (typeof window.Android !== "undefined") {
    if (typeof window.Android.openVrRedes === "function") {
      window.Android.openVrRedes(target);
      return;
    }
  }

  window.open(target, "_blank", "noopener,noreferrer");
}

/** Abre red social en modo Redes Cam. */
export function openHomeSocialRedesCam(url: string): void {
  const target = url.trim();
  if (!target) return;

  if (typeof window.Android !== "undefined") {
    if (typeof window.Android.openRedesCamDirect === "function") {
      window.Android.openRedesCamDirect(target);
      return;
    }
  }

  window.open(target, "_blank", "noopener,noreferrer");
}
