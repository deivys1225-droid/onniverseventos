import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Camera, Headset, Loader2, Lock, Mail, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { compressProfileImage } from "@/lib/compressProfileImage";
import { formatSupabaseAuthError } from "@/lib/supabaseErrors";
import { upsertProfile, uploadAvatar } from "@/lib/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getSiteUrl } from "@/lib/siteUrl";

const glassPanel =
  "rounded-2xl border border-border/50 bg-card/40 p-8 shadow-[0_0_45px_-12px_hsl(var(--primary)/0.45)] backdrop-blur-xl";

const RegisterPage = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    try {
      const compressed = await compressProfileImage(file);
      setAvatarFile(compressed);
      setPreview((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return URL.createObjectURL(compressed);
      });
    } catch {
      toast.error("No se pudo procesar la imagen. Prueba con otra foto.");
    }
    e.target.value = "";
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const site = getSiteUrl();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${site}/inicio`,
          data: {
            full_name: fullName.trim(),
            display_name: fullName.trim(),
          },
        },
      });

      if (error) throw error;

      const user = data.user;
      const session = data.session;

      if (user && session) {
        if (avatarFile) {
          const url = await uploadAvatar(user.id, avatarFile);
          await upsertProfile({ userId: user.id, fullName: fullName.trim(), avatarUrl: url });
        } else {
          await upsertProfile({ userId: user.id, fullName: fullName.trim(), avatarUrl: null });
        }
      }

      if (session) {
        toast.success("¡Cuenta lista! Entrando al universo…");
        navigate("/inicio", { replace: true });
      } else {
        toast.success("Revisa tu correo para confirmar la cuenta. Luego podrás iniciar sesión.");
        navigate("/entrar", { replace: true });
      }
    } catch (err: unknown) {
      toast.error(formatSupabaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_5%,hsl(var(--primary)/0.18),transparent_35%),radial-gradient(circle_at_85%_95%,hsl(290_80%_60%/0.16),transparent_40%)]" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      <main className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className={`w-full max-w-md ${glassPanel}`}
        >
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/40 bg-primary/10">
              <Headset className="h-8 w-8 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
              Crear cuenta en <span className="text-gradient-neon">OnniVers</span>
            </h1>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div className="flex flex-col items-center gap-3">
              <div className="relative h-24 w-24">
                <img
                  src={preview ?? "/placeholder.svg"}
                  alt="Vista previa de la foto de perfil para crear cuenta en OnniVers"
                  className="h-full w-full rounded-full border border-primary/30 object-cover ring-2 ring-white/10"
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full border border-primary/40 bg-background/90 text-primary shadow-lg backdrop-blur-md"
                  aria-label="Elegir foto de perfil"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={onFile} />
              <p className="text-center text-[11px] text-muted-foreground">
                La foto se comprime automáticamente para un envío ligero.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-name">Nombre</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="reg-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Tu nombre"
                  required
                  autoComplete="name"
                  className="border-border/50 bg-black/25 pl-10 backdrop-blur-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-email">Correo</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="reg-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  required
                  autoComplete="email"
                  className="border-border/50 bg-black/25 pl-10 backdrop-blur-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-password">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="reg-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="border-border/50 bg-black/25 pl-10 backdrop-blur-sm"
                />
              </div>
            </div>

            <Button type="submit" variant="hero" className="w-full min-h-12 font-display font-bold uppercase" disabled={loading}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Registrarme"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm">
            <Link to="/" className="text-muted-foreground underline-offset-4 transition hover:text-primary hover:underline">
              ← Volver a la portada
            </Link>
          </p>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <Link to="/entrar" className="font-semibold text-primary underline-offset-4 hover:underline">
              Iniciar sesión
            </Link>
          </p>
        </motion.div>
      </main>
    </div>
  );
};

export default RegisterPage;
