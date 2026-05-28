import { Button } from "@/components/ui/button";
import OnniVersoLogo from "@/components/branding/OnniVersoLogo";
import {
  Building2,
  Box,
  Download,
  FolderOpen,
  LogIn,
  LogOut,
  Menu,
  MessageCircle,
  Radio,
  ShoppingBag,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { APP_APK_DOWNLOAD_URL } from "@/config/appDownload";
import { LOCKED_NAVBAR_HEIGHT_CLASS, LOCKED_NAVBAR_MENU_OFFSET_CLASS } from "@/config/lockedHomeLayout";
import { isDesktopWebBrowser } from "@/lib/deviceDetection";
import { invokeOpenGalleryDirect } from "@/lib/galleryOpenDirect";
import { GALERIA_AULA_SECTION_HREF } from "@/lib/aulaVirtual";
import { invokeAndroidOnVrClick } from "@/lib/androidLobbyReturn";
import { isMobileUserAgent } from "@/lib/deviceDetection";
import { onOpCommand } from "@/lib/opCommandBus";

const NAV_ITEMS: { label: string; path: string; icon: LucideIcon }[] = [
  { label: "ONNIVERSO", path: "/inicio-2", icon: Sparkles },
  { label: "CONCIERTOS LIVE", path: "/nuestras-salas", icon: Radio },
  { label: "CHAT", path: "/comunidad", icon: MessageCircle },
  /** Sección galería + tarjeta Aula (solo navegación web; no abre lobby nativo). */
  { label: "AULA VIRTUAL", path: GALERIA_AULA_SECTION_HREF, icon: Box },
  { label: "REPRODUCTOR LOCAL", path: "/reproductor-galeria", icon: FolderOpen },
  { label: "TIENDA", path: "/tienda", icon: ShoppingBag },
  { label: "QUIENES SOMOS", path: "/quienes-somos", icon: Building2 },
];

const Navbar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAppDownload, setShowAppDownload] = useState(false);

  useEffect(() => {
    setShowAppDownload(isDesktopWebBrowser());
  }, []);

  useEffect(() => {
    return onOpCommand((cmd) => {
      if (cmd.type === "ui.menu.open") setIsMenuOpen(true);
      if (cmd.type === "ui.menu.close") setIsMenuOpen(false);
      if (cmd.type === "ui.menu.toggle") setIsMenuOpen((p) => !p);
    });
  }, []);

  const handleLogout = async () => {
    const inLobbyImmersive = location.pathname.startsWith("/lobby-inmersivo");
    if (inLobbyImmersive && isMobileUserAgent() && invokeAndroidOnVrClick()) {
      setIsMenuOpen(false);
      return;
    }
    await signOut();
    toast.success("Sesión cerrada");
    setIsMenuOpen(false);
    navigate("/inicio-2");
  };

  const closeMenu = () => setIsMenuOpen(false);

  const handleNavItemClick = (path: string, event: React.MouseEvent<HTMLAnchorElement>) => {
    if (path === "/reproductor-galeria" && invokeOpenGalleryDirect()) {
      event.preventDefault();
    }
    closeMenu();
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 w-full max-w-[100dvw] overflow-x-clip glass">
      <div
        className={`relative mx-auto flex ${LOCKED_NAVBAR_HEIGHT_CLASS} w-full max-w-full items-center justify-between gap-2 px-3 sm:px-6`}
      >
        <Link
          to="/"
          className="flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border-0 bg-transparent p-0 text-left focus-visible:outline focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label="OnniVers — Inicio"
        >
          <OnniVersoLogo className="shrink-0" iconSize={24} />
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          {user ? (
            <div className="hidden items-center gap-2 sm:flex">
              <span className="hidden max-w-[140px] truncate text-xs text-muted-foreground md:inline">
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
            <div className="hidden items-center gap-2 sm:flex">
              <Button variant="heroOutline" size="sm" className="gap-1.5" onClick={() => navigate("/entrar")}>
                <LogIn className="h-3.5 w-3.5" />
                Entrar
              </Button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú de navegación"}
            aria-expanded={isMenuOpen}
            className="inline-flex shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 p-2 text-primary transition hover:bg-primary/20"
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <>
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={closeMenu}
            className={`fixed inset-0 ${LOCKED_NAVBAR_MENU_OFFSET_CLASS} bg-background/70 backdrop-blur-sm`}
          />
          <div
            className={`absolute left-3 right-3 ${LOCKED_NAVBAR_MENU_OFFSET_CLASS} z-10 max-h-[min(70dvh,32rem)] overflow-y-auto rounded-2xl border border-primary/30 bg-card/95 p-4 shadow-[0_0_40px_-20px_hsl(var(--primary)/0.9)] backdrop-blur-xl sm:left-auto sm:right-3 sm:w-[min(calc(100vw-1.5rem),20rem)]`}
          >
            <p className="mb-3 px-1 text-[10px] font-display font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Navegación
            </p>
            <div className="flex flex-col gap-2">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={(event) => handleNavItemClick(item.path, event)}
                    className="flex min-h-[48px] w-full items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-left text-sm font-display font-semibold tracking-wide text-primary transition hover:bg-primary/15"
                  >
                    <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              {showAppDownload ? (
                <a
                  href={APP_APK_DOWNLOAD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={closeMenu}
                  className="flex min-h-[48px] w-full items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-left text-sm font-display font-semibold tracking-wide text-primary transition hover:bg-primary/15"
                >
                  <Download className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                  <span>DESCARGAR APP</span>
                </a>
              ) : null}
            </div>
            {user ? (
              <div className="mt-4 space-y-3 border-t border-border/40 pt-4 sm:hidden">
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                <Button variant="heroOutline" size="sm" onClick={handleLogout} className="w-full gap-1.5">
                  <LogOut className="h-3.5 w-3.5" />
                  Salir
                </Button>
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-2 border-t border-border/40 pt-4 sm:hidden">
                <Button
                  variant="heroOutline"
                  size="sm"
                  className="w-full gap-1.5"
                  onClick={() => {
                    closeMenu();
                    navigate("/entrar");
                  }}
                >
                  <LogIn className="h-3.5 w-3.5" />
                  Entrar
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
