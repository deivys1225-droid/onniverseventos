import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense, type ReactNode } from "react";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import { isPayPalConfigured, paypalScriptOptions } from "@/config/payments";
import GuestRoute from "@/components/auth/GuestRoute";
import PrivateRoute from "@/components/auth/PrivateRoute";
import Index from "./pages/Index.tsx";
import EventPage from "./pages/EventPage.tsx";
import AuthPage from "./pages/AuthPage.tsx";
import TiendaPage from "./pages/TiendaPage.tsx";
import PodcastHubPage from "./pages/PodcastHubPage.tsx";
import PodcastRoomPage from "./pages/PodcastRoomPage.tsx";
import TeatroHub from "./pages/TeatroHub.tsx";
import SalaTeatro from "./pages/SalaTeatro.tsx";
import LobbyGlobalPage from "./pages/LobbyGlobalPage.tsx";
import LobbyImmersivePage from "./pages/LobbyImmersivePage.tsx";
import EventosPage from "./pages/EventosPage.tsx";
import RedSocialInmersivaPage from "./pages/RedSocialInmersivaPage.tsx";
import InicioPage from "./pages/InicioPage.tsx";
import NuestrasSalasPage from "./pages/NuestrasSalasPage.tsx";
import ComunidadPage from "./pages/ComunidadPage.tsx";
import Galeria3DPage from "./pages/Galeria3DPage.tsx";
import EducacionPage from "./pages/EducacionPage.tsx";
import NotFound from "./pages/NotFound.tsx";
import PrivacidadPage from "./pages/PrivacidadPage.tsx";
import TerminosPage from "./pages/TerminosPage.tsx";
import QuienesSomosPage from "./pages/QuienesSomosPage.tsx";
import ContactoPage from "./pages/ContactoPage.tsx";
import WelcomeUniversePage from "./pages/WelcomeUniversePage.tsx";
import RegisterPage from "./pages/RegisterPage.tsx";
import UpdatePasswordPage from "./pages/UpdatePasswordPage.tsx";
const PcScenePage = lazy(() => import("./pages/PcScenePage.tsx"));
const EmisorView = lazy(() => import("./pages/EmisorView.tsx"));
const EspectadorView = lazy(() => import("./pages/EspectadorView.tsx"));
const LiveStreamPage = lazy(() => import("./pages/LiveStreamPage.tsx"));
import { CameraBackgroundProvider } from "@/contexts/CameraBackgroundContext";
const queryClient = new QueryClient();

function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center bg-background text-sm text-muted-foreground">
      Cargando…
    </div>
  );
}

const AppProviders = ({ children }: { children: ReactNode }) =>
  isPayPalConfigured ? (
    <PayPalScriptProvider options={paypalScriptOptions}>{children}</PayPalScriptProvider>
  ) : (
    <>{children}</>
  );

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppProviders>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <CameraBackgroundProvider>
          <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <InicioPage />
                </PrivateRoute>
              }
            />
            <Route path="/inicio" element={<Navigate to="/" replace />} />
            <Route path="/inicio-2" element={<Index />} />
            <Route
              path="/entrar"
              element={
                <GuestRoute>
                  <WelcomeUniversePage />
                </GuestRoute>
              }
            />
            <Route
              path="/registro"
              element={
                <GuestRoute>
                  <RegisterPage />
                </GuestRoute>
              }
            />
            <Route path="/actualizar-contrasena" element={<UpdatePasswordPage />} />
            <Route path="/auth" element={<AuthPage />} />

            <Route path="/privacidad" element={<PrivacidadPage />} />
            <Route path="/terminos" element={<TerminosPage />} />
            <Route path="/quienes-somos" element={<QuienesSomosPage />} />
            <Route path="/contacto" element={<ContactoPage />} />

            <Route
              path="/lobby-inmersivo"
              element={
                <PrivateRoute>
                  <LobbyImmersivePage />
                </PrivateRoute>
              }
            />
            <Route path="/eventos" element={<EventosPage />} />
            <Route path="/red-social-inmersiva" element={<RedSocialInmersivaPage />} />
            <Route
              path="/pc"
              element={
                <PrivateRoute>
                  <PcScenePage />
                </PrivateRoute>
              }
            />
            <Route
              path="/sala/emisor"
              element={
                <PrivateRoute>
                  <EmisorView />
                </PrivateRoute>
              }
            />
            <Route
              path="/sala/espectador/:channel"
              element={
                <PrivateRoute>
                  <EspectadorView />
                </PrivateRoute>
              }
            />
            <Route
              path="/nuestras-salas"
              element={
                <PrivateRoute>
                  <NuestrasSalasPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/live-stream"
              element={
                <PrivateRoute>
                  <LiveStreamPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/live-stream/:channel"
              element={
                <PrivateRoute>
                  <LiveStreamPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/comunidad"
              element={
                <PrivateRoute>
                  <ComunidadPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/3d"
              element={
                <PrivateRoute>
                  <Galeria3DPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/educacion"
              element={
                <PrivateRoute>
                  <EducacionPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/event/:id"
              element={
                <PrivateRoute>
                  <EventPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/tienda"
              element={
                <PrivateRoute>
                  <TiendaPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/podcast-hub"
              element={
                <PrivateRoute>
                  <PodcastHubPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/podcast/:id"
              element={
                <PrivateRoute>
                  <PodcastRoomPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/teatro-hub"
              element={
                <PrivateRoute>
                  <TeatroHub />
                </PrivateRoute>
              }
            />
            <Route
              path="/teatro/:id"
              element={
                <PrivateRoute>
                  <SalaTeatro />
                </PrivateRoute>
              }
            />
            <Route
              path="/mi-mundo/lobby-global"
              element={
                <PrivateRoute>
                  <LobbyGlobalPage />
                </PrivateRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          </CameraBackgroundProvider>
        </BrowserRouter>
      </TooltipProvider>
    </AppProviders>
  </QueryClientProvider>
);

export default App;
