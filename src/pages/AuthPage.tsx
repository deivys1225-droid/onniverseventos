import { Navigate } from "react-router-dom";

/** Ruta legacy: el login vive en `/`. */
const AuthPage = () => <Navigate to="/" replace />;

export default AuthPage;
