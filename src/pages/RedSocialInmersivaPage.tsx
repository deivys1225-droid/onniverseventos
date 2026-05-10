import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Globe2, MessageCircle, Sparkles, Users, ArrowRight } from "lucide-react";

const RED_SOCIAL_IMG = `${import.meta.env.BASE_URL}red-social-inmersiva.jpeg`;

const pillars = [
  {
    title: "Presencia real",
    body: "Avatares y espacios compartidos donde la interacción importa tanto como el contenido.",
    Icon: Users,
  },
  {
    title: "Chat y encuentros",
    body: "Grupos, mensajes y encuentros en tiempo real dentro del mismo entorno inmersivo.",
    Icon: MessageCircle,
  },
  {
    title: "Sin barreras de dispositivo",
    body: "El mismo lobby y la misma comunidad desde móvil u otros dispositivos compatibles.",
    Icon: Globe2,
  },
];

const RedSocialInmersivaPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16">
        <section className="relative overflow-hidden border-b border-primary/15 px-4 py-14 md:py-20">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,hsl(var(--primary)/0.14),transparent_55%)]" />
          <div className="relative container mx-auto max-w-4xl text-center">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/35 bg-cyan-500/10 px-4 py-1.5 text-xs font-display font-semibold uppercase tracking-wider text-cyan-100">
              <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
              OnniVers · Red social
            </span>
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-5xl">
              Red social <span className="text-primary">inmersiva</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
              No es solo un feed plano: es un lugar donde apareces, conversas y compartes dentro de escenas
              diseñadas para la nueva comunicación humana — comunidad, eventos y encuentros en el mismo ecosistema
              OnniVers.
            </p>
          </div>
        </section>

        <section className="container mx-auto max-w-5xl px-4 py-12 md:py-16">
          <div className="overflow-hidden rounded-2xl border border-primary/30 bg-card/50 shadow-[0_0_45px_-14px_hsl(var(--primary)/0.75)] backdrop-blur-xl">
            <div className="relative aspect-[21/9] max-h-56 w-full overflow-hidden md:max-h-72">
              <img
                src={RED_SOCIAL_IMG}
                alt="Ilustración de red social inmersiva OnniVers con personas conectadas en un espacio digital."
                className="h-full w-full object-cover object-[center_40%]"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
            </div>
            <CardContent className="space-y-8 p-6 md:p-10">
              <p className="text-center text-sm leading-relaxed text-muted-foreground md:text-base">
                Desde el lobby global hasta las salas temáticas, todo está pensado para que vivas la red como
                experiencia: presencia, voz y contenido alineados con la estética glass y futurista de la plataforma.
              </p>
              <div className="grid gap-4 md:grid-cols-3">
                {pillars.map(({ title, body, Icon }) => (
                  <Card
                    key={title}
                    className="border-primary/25 bg-card/60 backdrop-blur-md transition-colors hover:border-primary/45"
                  >
                    <CardContent className="p-5">
                      <Icon className="mb-3 h-8 w-8 text-primary" aria-hidden />
                      <h2 className="font-display text-lg font-semibold text-foreground">{title}</h2>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="flex flex-col items-center gap-4 border-t border-border/60 pt-8 sm:flex-row sm:justify-center">
                <Button variant="hero" className="min-h-[44px] gap-2 px-8" asChild>
                  <Link to="/nuestras-salas">
                    Ir a Salas
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </Button>
                <Button variant="heroOutline" className="min-h-[44px]" asChild>
                  <Link to="/entrar">Iniciar sesión</Link>
                </Button>
              </div>
              <p className="text-center text-xs text-muted-foreground">
                La sección Salas requiere cuenta OnniVers. Si aún no tienes acceso, regístrate o entra desde{" "}
                <Link to="/entrar" className="font-medium text-primary underline-offset-4 hover:underline">
                  Entrar
                </Link>
                .
              </p>
            </CardContent>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default RedSocialInmersivaPage;
