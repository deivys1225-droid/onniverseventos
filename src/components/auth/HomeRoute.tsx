import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import AuthLoadingSplash from "@/components/auth/AuthLoadingSplash";
import InicioPage from "@/pages/InicioPage";
import Index from "@/pages/Index";

/** Invitados y crawlers ven la landing indexable; usuarios autenticados van al inicio de la app. */
const HomeRoute = () => {
  const { user, loading } = useAuth();

  if (loading) return <AuthLoadingSplash />;
  if (user) return <InicioPage />;

  return <Index />;
};

export default HomeRoute;
