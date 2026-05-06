import { Navigate } from "react-router-dom";

/** Ruta legacy: el login vive en `/`. */
const AuthPage = () => <Navigate to="/entrar" replace />;

export default AuthPage;
