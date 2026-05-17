import { Button } from "@/components/ui/button";
import OnniVersoLogo from "@/components/branding/OnniVersoLogo";
import { LogIn, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useState } from "react";

const APP_APK_DOWNLOAD_URL =
  "https://drive.google.com/file/d/1dzJRInrQ2w6uS1wb_RVEHwLVtQTOIqoE/view?usp=sharing";

const NAV_ITEMS = [
  { label: "VIVEVR", path: "/inicio-2" },
  { label: "SALAS", path: "/nuestras-salas" },
  { label: "TIENDA", path: "/tienda" },
  { label: "QUIENES SOMOS", path: "/quienes-somos" },
] as const;

const navLinkClass =
  "relative inline-flex min-h-[44px] items-center justify-center rounded-full border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-display font-semibold tracking-wider text-primary transition-all duration-300 hover:border-primary/60 hover:bg-primary/15 glow-cyan sm:px-4 sm:text-sm";

const Navbar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    toast.success("Sesión cerrada");
    navigate("/inicio-2");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="container mx-auto flex h-16 max-w-full items-center justify-between gap-2 px-4 sm:px-6">
        <Link
          to="/"
          className="flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border-0 bg-transparent p-0 text-left focus-visible:outline focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label="OnniVers — Inicio"
        >
          <OnniVersoLogo />
        </Link>

        <div className="hidden min-w-0 flex-1 items-center justify-center gap-1.5 md:flex lg:gap-2">
          {NAV_ITEMS.map((item) => (
            <Link key={item.path} to={item.path} className={navLinkClass}>
              {item.label}
            </Link>
          ))}
        </div>

        {user ? (
          <div className="hidden shrink-0 items-center gap-3 md:flex">
            <span className="hidden max-w-[140px] truncate text-xs text-muted-foreground sm:inline">
              {user.email ??
                (typeof user.user_metadata?.full_name === "string"
                  ? user.user_metadata.full_name
                  : "Modo local")}
            </span>
            <Button variant="heroOutline" size="sm" onClick={handleLogout} className="gap-1.5">
              <LogOut className="h-3.5 w-3.5" />
              Salir
            </Button>
          </div>
        ) : (
          <div className="hidden shrink-0 items-center gap-2 md:flex">
            <Button variant="heroOutline" size="sm" className="gap-1.5" onClick={() => navigate("/entrar")}>
              <LogIn className="h-3.5 w-3.5" />
              Entrar
            </Button>
            <Button variant="hero" size="sm" asChild>
              <a href={APP_APK_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer">
                App
              </a>
            </Button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          aria-label={isMobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={isMobileMenuOpen}
          className="inline-flex shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 p-2 text-primary transition hover:bg-primary/20 md:hidden"
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <>
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 top-16 bg-background/70 backdrop-blur-sm md:hidden"
          />
          <div className="absolute left-4 right-4 top-16 rounded-2xl border border-primary/30 bg-card/95 p-4 shadow-[0_0_40px_-20px_hsl(var(--primary)/0.9)] backdrop-blur-xl md:hidden">
            <div className="flex flex-col gap-2">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex min-h-[48px] w-full items-center rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-left text-sm font-display font-semibold tracking-wide text-primary transition hover:bg-primary/15"
                >
                  {item.label}
                </Link>
              ))}
            </div>
            {user ? (
              <div className="mt-4 space-y-3">
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                <Button variant="heroOutline" size="sm" onClick={handleLogout} className="w-full gap-1.5">
                  <LogOut className="h-3.5 w-3.5" />
                  Salir
                </Button>
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-2">
                <Button
                  variant="heroOutline"
                  size="sm"
                  className="w-full gap-1.5"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    navigate("/entrar");
                  }}
                >
                  <LogIn className="h-3.5 w-3.5" />
                  Entrar
                </Button>
                <Button variant="hero" size="sm" asChild className="w-full">
                  <a
                    href={APP_APK_DOWNLOAD_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Descargar app
                  </a>
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </nav>
  );
};

export default Navbar;
