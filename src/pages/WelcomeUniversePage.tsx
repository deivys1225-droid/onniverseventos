import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Headset, Loader2, Lock, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatSupabaseAuthError } from "@/lib/supabaseErrors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const glassPanel =
  "rounded-2xl border border-border/50 bg-card/40 p-8 shadow-[0_0_45px_-12px_hsl(var(--primary)/0.45)] backdrop-blur-xl";
const APP_APK_DOWNLOAD_URL =
  "https://drive.google.com/file/d/1dzJRInrQ2w6uS1wb_RVEHwLVtQTOIqoE/view?usp=sharing";

const WelcomeUniversePage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const sendRecovery = async () => {
    if (!email.trim()) {
      toast.error("Escribe tu correo en el campo de arriba.");
      return;
    }
    setLoading(true);
    try {
      const site = window.location.origin;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${site}/actualizar-contrasena`,
      });
      if (error) throw error;
      toast.success("Revisa tu correo. Te enviamos un enlace para restablecer la contraseña.");
    } catch (err: unknown) {
      toast.error(formatSupabaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      toast.success("Bienvenido al universo");
      navigate("/inicio", { replace: true });
    } catch (err: unknown) {
      toast.error(formatSupabaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,hsl(var(--primary)/0.2),transparent_40%),radial-gradient(circle_at_80%_90%,hsl(290_80%_60%/0.16),transparent_45%)]" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
      </div>

      <main className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className={`w-full max-w-md ${glassPanel}`}
        >
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/40 bg-primary/10 shadow-[0_0_30px_-8px_hsl(var(--primary)/0.55)]">
              <Headset className="h-8 w-8 text-primary" />
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
              Bienvenida al <span className="text-gradient-neon">Universo</span>
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Entra con tu cuenta OnniVerso para explorar la Tierra y tus salas inmersivas.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="welcome-email" className="text-foreground">
                Correo
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="welcome-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  required
                  className="border-border/50 bg-black/25 pl-10 backdrop-blur-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="welcome-password" className="text-foreground">
                Contraseña
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="welcome-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="border-border/50 bg-black/25 pl-10 backdrop-blur-sm"
                />
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={sendRecovery}
                  disabled={loading}
                  className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                >
                  Olvidé mi contraseña
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="hero"
              className="w-full min-h-12 font-display font-bold uppercase tracking-wide"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Entrar"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm">
            <Link to="/" className="text-muted-foreground underline-offset-4 transition hover:text-primary hover:underline">
              ← Volver a la portada (Mundial VR)
            </Link>
          </p>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            ¿Aún no tienes cuenta?{" "}
            <Link
              to="/registro"
              className="font-semibold text-primary underline-offset-4 transition hover:underline"
            >
              Regístrate
            </Link>
          </p>
          <Button variant="hero" size="sm" asChild className="mt-3 w-full">
            <a href={APP_APK_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer">
              Descargar app
            </a>
          </Button>
        </motion.div>
      </main>
    </div>
  );
};

export default WelcomeUniversePage;
