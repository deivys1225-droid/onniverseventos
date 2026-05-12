import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Headset, Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const glassPanel =
  "rounded-2xl border border-border/50 bg-card/40 p-8 shadow-[0_0_45px_-12px_hsl(var(--primary)/0.45)] backdrop-blur-xl";

/**
 * Llegada desde el enlace del correo de recuperación (redirect URL en Supabase Auth).
 */
const UpdatePasswordPage = () => {
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [ready, setReady] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      const search = window.location.search;
      if (
        hash.includes("type=recovery") ||
        hash.includes("PASSWORD_RECOVERY") ||
        search.includes("type=recovery")
      ) {
        setRecoveryMode(true);
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryMode(true);
      }
    });

    supabase.auth.getSession().then(() => setReady(true));

    return () => subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== password2) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Contraseña actualizada. Ya puedes entrar.");
      await supabase.auth.signOut();
      navigate("/", { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudo actualizar";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!recoveryMode) {
    return (
      <div className="relative min-h-[100dvh] bg-background px-6 py-20">
        <div className={`mx-auto max-w-md ${glassPanel} text-center`}>
          <Headset className="mx-auto mb-4 h-10 w-10 text-primary" />
          <p className="text-muted-foreground">
            Abre este enlace desde el correo de recuperación de contraseña. Si ya pediste uno, revisa la bandeja de
            entrada.
          </p>
          <Button variant="heroOutline" className="mt-6" onClick={() => navigate("/inicio-2")}>
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_20%,hsl(var(--primary)/0.15),transparent_50%)]" />
      <main className="relative z-10 flex min-h-[100dvh] items-center justify-center px-6 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`w-full max-w-md ${glassPanel}`}>
          <h1 className="mb-2 text-center font-display text-2xl font-bold">Nueva contraseña</h1>
          <p className="mb-6 text-center text-sm text-muted-foreground">Elige una contraseña segura para tu cuenta.</p>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="np1">Nueva contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="np1"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="border-border/50 bg-black/25 pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="np2">Confirmar contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="np2"
                  type="password"
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  required
                  minLength={6}
                  className="border-border/50 bg-black/25 pl-10"
                />
              </div>
            </div>
            <Button type="submit" variant="hero" className="w-full min-h-12" disabled={loading}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Guardar contraseña"}
            </Button>
          </form>
        </motion.div>
      </main>
    </div>
  );
};

export default UpdatePasswordPage;
