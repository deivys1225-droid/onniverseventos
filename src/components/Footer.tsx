import { Link } from "react-router-dom";
import OnniVersoLogo from "@/components/branding/OnniVersoLogo";

const Footer = () => {
  return (
    <footer className="border-t border-border px-6 py-12">
      <div className="container mx-auto flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-3">
          <OnniVersoLogo iconSize={32} />
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            <strong className="font-medium text-foreground">Empresa Tecnológica de Colombia S.A.S.</strong>{" "}
            <span className="whitespace-nowrap tabular-nums">NIT 901.083.478-0</span>
            <br />
            OnniVers · © 2017–2026 · Casi una década de trayectoria tecnológica con operación continua desde 2017.
          </p>
        </div>
        <nav
          className="flex flex-wrap items-start gap-x-8 gap-y-3 text-sm text-muted-foreground md:justify-end"
          aria-label="Enlaces legales y contacto"
        >
          <Link to="/quienes-somos" className="transition-colors hover:text-foreground">
            Quiénes somos
          </Link>
          <Link to="/privacidad" className="transition-colors hover:text-foreground">
            Privacidad
          </Link>
          <Link to="/terminos" className="transition-colors hover:text-foreground">
            Términos
          </Link>
          <Link to="/contacto" className="transition-colors hover:text-foreground">
            Contacto
          </Link>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;
