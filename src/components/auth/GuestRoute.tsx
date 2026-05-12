import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import AuthLoadingSplash from "@/components/auth/AuthLoadingSplash";

const GuestRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) return <AuthLoadingSplash />;
  if (user) return <Navigate to="/" replace />;

  return <>{children}</>;
};

export default GuestRoute;
