import { Capacitor } from "@capacitor/core";
import { Clapperboard } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { isMobileUserAgent } from "@/lib/deviceDetection";

/**
 * Botón Mega Cine siempre visible en app nativa / móvil (portal a body).
 * En inicio queda debajo del chat; en otras rutas, arriba a la derecha.
 */
export default function MegaCineNativeFab() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
    const sync = () => {
      setVisible(Capacitor.isNativePlatform() || isMobileUserAgent());
    };
    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
    };
  }, []);

  if (!mounted || !visible || location.pathname === "/mega-cine") {
    return null;
  }

  const isHome = location.pathname === "/" || location.pathname === "/inicio";
  const top = isHome
    ? "calc(env(safe-area-inset-top, 0px) + 8.5rem)"
    : "calc(env(safe-area-inset-top, 0px) + 4.75rem)";

  return createPortal(
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        navigate("/mega-cine");
      }}
      aria-label="Abrir Mega Cine"
      className="touch-manipulation"
      style={{
        position: "fixed",
        zIndex: 99999,
        top,
        right: "max(0.75rem, env(safe-area-inset-right, 0px))",
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        minHeight: "3rem",
        padding: "0 1rem",
        borderRadius: "9999px",
        border: "2px solid #c4b5fd",
        background: "#7c3aed",
        color: "#fff",
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        boxShadow: "0 0 32px -4px rgba(167,139,250,1)",
      }}
    >
      <Clapperboard className="h-5 w-5 shrink-0" aria-hidden />
      Mega Cine
    </button>,
    document.body,
  );
}
