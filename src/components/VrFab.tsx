import { useLocation } from "react-router-dom";

/** Icono de lentes / goggles VR: dos lentes, puente y alzas laterales (estilo Lucide, trazo 2). */
function VrLentesIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="8" cy="12" r="3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="11.5" y1="12" x2="12.5" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="16" cy="12" r="3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 12h2.5M19.5 12H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** FAB VR: en Android llama {@code window.Android.onVrModeClick()}; en navegador alterna SBS vía {@code __onniversoToggleVrMode}. */
const VrFab = () => {
  const { pathname } = useLocation();
  if (pathname.startsWith("/sala/emisor") || pathname.startsWith("/sala/espectador")) {
    return null;
  }

  const onVrFabClick = () => {
    if (typeof window.Android?.onVrModeClick === "function") {
      window.Android.onVrModeClick();
      return;
    }
    window.__onniversoToggleVrMode?.();
  };

  return (
    <button
      type="button"
      aria-label="Modo VR estereoscópico (interruptor)"
      title="VR — modo estereoscópico"
      className="fixed bottom-5 right-5 z-40 inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-cyan-400/45 bg-background/75 text-cyan-200 shadow-[0_0_28px_-6px_rgba(34,211,238,0.45)] backdrop-blur-md transition hover:border-cyan-300/75 hover:bg-background/90 hover:text-cyan-50 hover:shadow-[0_0_36px_-4px_rgba(34,211,238,0.55)]"
      onClick={onVrFabClick}
    >
      <VrLentesIcon className="h-5 w-5 shrink-0" />
    </button>
  );
};

export default VrFab;
