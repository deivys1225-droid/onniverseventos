import { Link } from "react-router-dom";
import OnniVersoLogo from "@/components/branding/OnniVersoLogo";
import {
  FacebookGlyph,
  InstagramGlyph,
  SOCIAL_LINKS,
  TikTokGlyph,
  socialFooterIconClass,
} from "@/components/SocialFooterIcons";

const legalLinkClass =
  "font-medium text-primary underline-offset-4 transition-colors hover:text-primary hover:underline";

const Footer = () => {
  return (
    <footer className="border-t border-border px-6 py-12">
      <div className="container mx-auto flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-3">
          <OnniVersoLogo iconSize={32} />
          <div className="max-w-md space-y-2">
            <p className="text-sm leading-relaxed text-muted-foreground">
              <strong className="font-medium text-foreground">Empresa Tecnológica de Colombia S.A.S.</strong>{" "}
              <span className="whitespace-nowrap tabular-nums">NIT 901.083.478-0</span>
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-0.5" aria-label="Redes sociales de Empresa Tecnológica de Colombia">
              <a
                href={SOCIAL_LINKS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className={socialFooterIconClass}
                aria-label="Instagram — Empresa Tecnológica de Colombia"
              >
                <InstagramGlyph />
              </a>
              <a
                href={SOCIAL_LINKS.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className={socialFooterIconClass}
                aria-label="Facebook — Empresa Tecnológica de Colombia"
              >
                <FacebookGlyph />
              </a>
              <a
                href={SOCIAL_LINKS.tiktok}
                target="_blank"
                rel="noopener noreferrer"
                className={socialFooterIconClass}
                aria-label="TikTok — Empresa Tecnológica de Colombia"
              >
                <TikTokGlyph />
              </a>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              OnniVers · © 2017–2026 · Casi una década de trayectoria tecnológica con operación continua desde 2017.
            </p>
          </div>
        </div>
        <nav
          className="flex flex-wrap items-start gap-x-8 gap-y-3 text-sm text-muted-foreground md:justify-end"
          aria-label="Enlaces legales y contacto"
        >
          <Link to="/quienes-somos" className="transition-colors hover:text-foreground">
            Quiénes somos
          </Link>
          <Link to="/privacidad" className={legalLinkClass}>
            Privacidad
          </Link>
          <Link to="/terminos" className={legalLinkClass}>
            Términos
          </Link>
          <Link to="/contacto" className="transition-colors hover:text-foreground">
            Contacto
          </Link>
        </nav>
      </div>
      <p className="container mx-auto mt-10 max-w-4xl border-t border-border/70 pt-6 text-center text-[11px] leading-relaxed text-muted-foreground md:text-xs">
        Este sitio cumple con los estándares de seguridad SSL y protección de datos Habeas Data.
      </p>
    </footer>
  );
};

export default Footer;
