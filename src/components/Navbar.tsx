import { Button } from "@/components/ui/button";
import { Headset, LogIn, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

const APP_APK_DOWNLOAD_URL =
  "https://drive.google.com/uc?export=download&id=1bttG_2hiZQuTNkFoJXUv4ds1x1W7PLAM";

const Navbar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Sesión cerrada");
    navigate("/");
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  const navItems = [
    { label: "INICIO", action: () => handleNavigate("/inicio") },
    { label: "SALAS", action: () => handleNavigate("/nuestras-salas") },
    { label: "TIENDA", action: () => handleNavigate("/tienda") },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleNavigate("/")}>
          <Headset className="w-6 h-6 text-primary" />
          <span className="font-display font-bold text-lg text-foreground tracking-tight">
            ViveVR
          </span>
        </div>

        <div className="hidden md:flex items-center gap-2">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              className="relative px-4 py-1.5 text-sm font-display font-semibold tracking-wider text-primary border border-primary/30 rounded-full bg-primary/5 hover:bg-primary/15 hover:border-primary/60 transition-all duration-300 glow-cyan"
            >
              {item.label}
            </button>
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
                <button
                  key={item.label}
                  onClick={item.action}
                  className="w-full rounded-xl border border-primary/30 bg-primary/5 px-4 py-2 text-left text-sm font-display font-semibold tracking-wide text-primary transition hover:bg-primary/15"
                >
                  {item.label}
                </button>
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
