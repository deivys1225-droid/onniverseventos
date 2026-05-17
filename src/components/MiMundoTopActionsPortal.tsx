import { Clapperboard, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";

type MiMundoTopActionsPortalProps = {
  socialMenuOpen: boolean;
  onToggleSocial: () => void;
};

/**
 * Chat + Mega Cine en portal a `body` (mismo patrón que CameraToggleButton).
 * Evita que el WebView de Android recorte `position: fixed` dentro de la escena 3D.
 */
export default function MiMundoTopActionsPortal({
  socialMenuOpen,
  onToggleSocial,
}: MiMundoTopActionsPortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className="pointer-events-none flex flex-col items-end gap-2.5"
      style={{
        position: "fixed",
        zIndex: 9999,
        top: "max(4.5rem, calc(env(safe-area-inset-top, 0px) + 4rem))",
        right: "max(0.75rem, env(safe-area-inset-right, 0px))",
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleSocial();
        }}
        aria-label={socialMenuOpen ? "Cerrar Messenger" : "Abrir Messenger"}
        aria-expanded={socialMenuOpen}
        className="pointer-events-auto inline-flex h-12 w-12 min-h-12 min-w-12 touch-manipulation items-center justify-center rounded-full border-2 border-cyan-400/70 bg-slate-950 text-cyan-100 shadow-[0_0_28px_-4px_rgba(34,211,238,0.95)]"
      >
        <UsersRound className="h-5 w-5" />
      </button>
      <Link
        to="/mega-cine"
        className="pointer-events-auto inline-flex h-12 w-12 min-h-12 min-w-12 touch-manipulation items-center justify-center rounded-full border-2 border-violet-300 bg-violet-500 text-white shadow-[0_0_32px_-4px_rgba(167,139,250,1)]"
        aria-label="Mega Cine"
        title="Mega Cine"
        onClick={(e) => e.stopPropagation()}
      >
        <Clapperboard className="h-5 w-5 shrink-0" aria-hidden />
      </Link>
    </div>,
    document.body,
  );
}
