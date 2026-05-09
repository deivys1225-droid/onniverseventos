import { Headphones } from "lucide-react";
import { useLocation } from "react-router-dom";

const MAIL_SUPPORT = "mailto:gerencia@onniverso.com?subject=Soporte%20T%C3%A9cnico%20OnniVers";

/** Botón flotante de contacto — oculto en salas de emisión/reproducción para no interferir con la UI inmersiva. */
const SupportTechFab = () => {
  const { pathname } = useLocation();
  if (pathname.startsWith("/sala/emisor") || pathname.startsWith("/sala/espectador")) {
    return null;
  }

  return (
    <a
      href={MAIL_SUPPORT}
      className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full border border-primary/45 bg-background/75 px-4 py-2.5 text-sm font-semibold text-primary shadow-[0_0_28px_-6px_hsl(var(--primary)/0.55)] backdrop-blur-md transition hover:border-primary/70 hover:bg-background/90 hover:shadow-[0_0_36px_-4px_hsl(var(--primary)/0.65)]"
    >
      <Headphones className="h-4 w-4 shrink-0" aria-hidden />
      Soporte Técnico
    </a>
  );
};

export default SupportTechFab;
