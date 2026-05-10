import { Button } from "@/components/ui/button";
import OnniVersoLogo from "@/components/branding/OnniVersoLogo";
import { LogIn, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

const APP_APK_DOWNLOAD_URL =
  "https://drive.google.com/file/d/1dzJRInrQ2w6uS1wb_RVEHwLVtQTOIqoE/view?usp=sharing";

const Navbar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Sesión cerrada");
    navigate("/");
  };

  const navItems = [
    { label: "INICIO", path: "/inicio" },
    { label: "SALAS", path: "/nuestras-salas" },
    { label: "TIENDA", path: "/tienda" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <Link
          to="/"
          className="flex cursor-pointer items-center gap-2 rounded-lg border-0 bg-transparent p-0 text-left focus-visible:outline focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label="OnniVers — Inicio"
        >
          <OnniVersoLogo />
        </Link>

        <div className="hidden md:flex items-center gap-2">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.path}
              className="relative inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-sm font-display font-semibold tracking-wider text-primary border border-primary/30 rounded-full bg-primary/5 hover:bg-primary/15 hover:border-primary/60 transition-all duration-300 glow-cyan"
            >
              {item.label}
            </Link>
          ))}
        </div>

        {user ? (
          <div className="hidden md:flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:inline truncate max-w-[140px]">
              {user.email}
            </span>
            <Button variant="heroOutline" size="sm" onClick={handleLogout} className="gap-1.5">
              <LogOut className="w-3.5 h-3.5" />
              Salir
            </Button>
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-2">
            <Button variant="heroOutline" size="sm" className="gap-1.5" onClick={() => navigate("/entrar")}>
              <LogIn className="w-3.5 h-3.5" />
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
          className="md:hidden inline-flex items-center justify-center rounded-full border border-primary/40 bg-primary/10 p-2 text-primary transition hover:bg-primary/20"
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
            className="md:hidden fixed inset-0 top-16 bg-background/70 backdrop-blur-sm"
          />
          <div className="md:hidden absolute top-16 left-4 right-4 rounded-2xl border border-primary/30 bg-card/95 backdrop-blur-xl p-4 shadow-[0_0_40px_-20px_hsl(var(--primary)/0.9)]">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.label}
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
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                <Button variant="heroOutline" size="sm" onClick={handleLogout} className="w-full gap-1.5">
                  <LogOut className="w-3.5 h-3.5" />
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
                  <LogIn className="w-3.5 h-3.5" />
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
