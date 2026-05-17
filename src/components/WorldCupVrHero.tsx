import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Users, Music2, GraduationCap, Store, ArrowRight, Smartphone, Rss } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ALT_CARD_MUNDIAL_STREAMING, ALT_CARD_ONNI_ECOSYSTEM, ALT_HERO_BACKDROP } from "@/lib/seoBrand";

/** Arte OnniVerso (metaverso / pilares) — servido desde `public/` para web y Capacitor (`base: "./"`). */
const ONNI_ECOSYSTEM_HERO_IMAGE = `${import.meta.env.BASE_URL}onni-ecosystem-metaverse.png`;

/** Ilustración accesibilidad: diversidad de dispositivos y experiencia inmersiva para todos. */
const ACCESSIBILITY_CARD_IMAGE = `${import.meta.env.BASE_URL}accesibilidad-universal.jpeg`;

/** Arte en `public/` y Unsplash — una por pilar visual del ecosistema. */
const PILLAR_IMAGES = {
  /** Ilustración propia: aula OnniVers con cascos RV y modelos holográficos 3D. */
  education: `${import.meta.env.BASE_URL}educacion-inmersiva.jpeg`,
  /** Ilustración propia: conciertos, estadio virtual y metaverso OnniVers. */
  events: `${import.meta.env.BASE_URL}eventos-inmersivos.jpeg`,
  /** Ilustración propia: tienda inmersiva OnniVers con RA, vitrinas holográficas y compras digitales. */
  stores: `${import.meta.env.BASE_URL}compras-inmersivas.jpeg`,
  /** Ilustración propia: plaza digital, avatares y red social inmersiva OnniVers. */
  social: `${import.meta.env.BASE_URL}red-social-inmersiva.jpeg`,
} as const;

type PillarKey = keyof typeof PILLAR_IMAGES;

const pillars: {
  key: PillarKey;
  title: string;
  description: string;
  imageAlt: string;
  to: string;
  badge: string;
  Icon: typeof GraduationCap;
  accent: "amber" | "fuchsia" | "emerald" | "cyan";
}[] = [
  {
    key: "events",
    title: "CONCIERTOS INMERSIVOS DE REALIDAD VIRTUAL",
    description:
      "No solo mires el evento, sé parte de él. Transmisiones 360° en vivo, realidad mixta y aforo virtual ilimitado desde cualquier dispositivo.",
    imageAlt:
      "Universo de eventos inmersivos OnniVers: conciertos virtuales, estadio con realidad mixta y experiencias 360°.",
    to: "/eventos",
    badge: "En vivo & 360°",
    Icon: Sparkles,
    accent: "fuchsia",
  },
  {
    key: "social",
    title: "Red social inmersiva",
    description:
      "Encuentros, comunidades y contenido en espacios compartidos virtuales: interacción en tiempo real, presencia y conexión pensadas para la nueva comunicación humana, no solo para desplazar el feed a otra pantalla.",
    imageAlt:
      "Red social inmersiva OnniVers: personas con cascos RV, interacción en plaza digital y conexión en comunidad.",
    to: "/red-social-inmersiva",
    badge: "Comunidad",
    Icon: Users,
    accent: "cyan",
  },
  {
    key: "education",
    title: "Educación inmersiva",
    description:
      "Soluciones tecnológicas para colegios y universidades: aulas con realidad aumentada, laboratorios virtuales y rutas donde el estudiante vive el conocimiento —histórico, científico o técnico— con modelos 3D y simulación, sin sustituir al docente sino ampliando el aula al mundo.",
    imageAlt:
      "Educación inmersiva OnniVers: estudiantes en aula futurista con RV, ADN y sistema solar holográficos.",
    to: "/educacion",
    badge: "Campus & aulas",
    Icon: GraduationCap,
    accent: "amber",
  },
  {
    key: "stores",
    title: "Tiendas inmersivas",
    description:
      "Comercio digital con vitrinas espaciales y recorridos en RA: productos y marcas en escenas diseñadas para explorar, comparar y comprar fuera del catálogo plano tradicional.",
    imageAlt:
      "Tienda inmersiva OnniVers: centro comercial futurista con cascos RV, productos holográficos y compra aumentada.",
    to: "/tienda",
    badge: "Retail digital",
    Icon: Store,
    accent: "emerald",
  },
];

const accentBadge: Record<(typeof pillars)[number]["accent"], string> = {
  amber: "border-amber-400/45 bg-amber-500/12 text-amber-100",
  fuchsia: "border-fuchsia-400/45 bg-fuchsia-500/12 text-fuchsia-100",
  emerald: "border-emerald-400/45 bg-emerald-500/12 text-emerald-100",
  cyan: "border-cyan-400/45 bg-cyan-500/12 text-cyan-100",
};

const accentIcon: Record<(typeof pillars)[number]["accent"], string> = {
  amber: "text-amber-300",
  fuchsia: "text-fuchsia-300",
  emerald: "text-emerald-300",
  cyan: "text-cyan-300",
};

function AccessibilitySpotlightCard() {
  const navigate = useNavigate();

  return (
    <Card className="overflow-hidden border border-primary/35 bg-card/60 backdrop-blur-xl shadow-[0_0_45px_-14px_hsl(var(--primary)/0.8)]">
      <div className="relative h-44 overflow-hidden sm:h-48">
        <img
          src={ACCESSIBILITY_CARD_IMAGE}
          alt="Personas diversas con smartphones y RV: accesibilidad universal de la tecnología inmersiva OnniVers."
          className="h-full w-full object-cover object-[center_45%]"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/25 to-transparent" />
      </div>
      <CardContent className="p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <h3 className="min-w-0 flex-1 font-display text-lg font-bold leading-snug sm:text-xl md:text-[1.35rem]">
            <span className="bg-gradient-to-r from-cyan-100 via-primary to-violet-200 bg-clip-text text-transparent drop-shadow-[0_0_28px_hsl(175_80%_52%/0.22)]">
              Accesibilidad Universal
            </span>
          </h3>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-sky-400/45 bg-sky-500/12 px-3 py-1.5 text-[10px] font-display font-bold uppercase tracking-wider text-sky-100 sm:text-xs">
            <span className="relative inline-flex items-center" aria-hidden>
              <Smartphone className="h-3.5 w-3.5 shrink-0 text-sky-300" />
              <Rss className="-ml-0.5 h-3 w-3 shrink-0 text-sky-200/95" />
            </span>
            Alcance global
          </span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Tecnología inmersiva y de Realidad Aumentada diseñada para funcionar en cualquier dispositivo móvil, desde
          modelos económicos hasta los de última generación. Sin necesidad de equipos costosos: vive una experiencia
          total con el celular que ya tienes. Rompemos las barreras técnicas para conectar al mundo entero.
        </p>
        <Button
          type="button"
          variant="heroOutline"
          className="mt-5 w-full min-h-[44px] gap-2 sm:min-h-0"
          onClick={() => navigate("/inicio")}
        >
          Explorar
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
      </CardContent>
    </Card>
  );
}

function PillarSpotlightCard({ pillar }: { pillar: (typeof pillars)[number] }) {
  const navigate = useNavigate();
  const Icon = pillar.Icon;

  return (
    <Card className="overflow-hidden border border-primary/35 bg-card/60 backdrop-blur-xl shadow-[0_0_45px_-14px_hsl(var(--primary)/0.8)]">
      <div className="relative h-44 overflow-hidden">
        <img
          src={PILLAR_IMAGES[pillar.key]}
          alt={pillar.imageAlt}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/25 to-transparent" />
      </div>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 flex-1 font-display text-xl font-semibold text-foreground">{pillar.title}</h3>
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-display font-bold uppercase tracking-wider text-right sm:text-xs",
              accentBadge[pillar.accent],
            )}
          >
            <Icon className={cn("h-3.5 w-3.5 shrink-0", accentIcon[pillar.accent])} aria-hidden />
            {pillar.badge}
          </span>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{pillar.description}</p>
        <Button
          type="button"
          variant="heroOutline"
          className="mt-5 w-full gap-2"
          onClick={() => navigate(pillar.to)}
        >
          Explorar
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
      </CardContent>
    </Card>
  );
}

const WorldCupVrHero = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[100dvh] overflow-hidden px-6 pt-24 pb-16">
      <div className="absolute inset-0" data-camera-decorative-bg>
        <img
          src="https://images.unsplash.com/photo-1577223625816-7546f13df25d?auto=format&fit=crop&w=2200&q=80"
          alt={ALT_HERO_BACKDROP}
          className="h-full w-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,hsl(190_70%_48%/.14),transparent_42%),radial-gradient(circle_at_85%_22%,hsl(270_55%_52%/.12),transparent_38%),linear-gradient(to_bottom,hsl(230_45%_8%/.45),hsl(235_40%_4%/.82))]" />
      </div>

      <div className="relative z-20 container mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75 }}
          className="relative z-20 mb-14 px-2 text-center md:mb-16"
        >
          <h1 className="mx-auto max-w-5xl font-headline font-semibold leading-[1.12]">
            <span className="block bg-gradient-to-br from-cyan-50 via-white to-slate-200 bg-clip-text text-transparent text-[clamp(1.85rem,6.5vw,3.25rem)] tracking-[0.18em] sm:tracking-[0.22em]">
              ONNIVERS
            </span>
          </h1>
          <h2 className="mx-auto mt-3 max-w-5xl px-2 font-headline text-[clamp(0.75rem,2.6vw,1.05rem)] font-medium leading-snug tracking-[0.08em] text-primary drop-shadow-[0_0_28px_hsl(175_80%_50%/0.38)] sm:mt-4 sm:tracking-[0.1em] md:leading-relaxed">
            Realidad Inmersiva, Educación, Conciertos y Tecnología Accesible
          </h2>
        </motion.div>

        <div className="mx-auto mb-6 max-w-4xl space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06, duration: 0.6 }}
          >
            <AccessibilitySpotlightCard />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
          >
            <Card className="overflow-hidden border border-primary/35 bg-card/60 backdrop-blur-xl shadow-[0_0_45px_-14px_hsl(var(--primary)/0.8)]">
              <div className="onniverso-hero-platform-visual relative h-52 overflow-hidden bg-gradient-to-b from-[hsl(230_42%_11%)] to-[hsl(235_38%_7%)] ring-1 ring-inset ring-primary/20 md:h-56">
                <img
                  src={ONNI_ECOSYSTEM_HERO_IMAGE}
                  alt={ALT_CARD_ONNI_ECOSYSTEM}
                  className="h-full w-full object-cover object-[center_42%_38%] md:object-[center_45%_35%]"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-card/5" />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,hsl(230_45%_6%/0.35)_0%,transparent_50%)]" />
              </div>
              <CardContent className="p-6">
                <h3 className="font-display text-xl font-semibold leading-snug tracking-tight md:text-[1.35rem]">
                  <span className="bg-gradient-to-r from-cyan-100 via-white to-violet-200 bg-clip-text text-transparent drop-shadow-[0_0_28px_hsl(175_80%_52%/0.22)]">
                    OnniVerso: El Ecosistema Digital Inmersivo.
                  </span>
                </h3>
                <ul
                  className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-2.5"
                  aria-label="Cuatro pilares de OnniVerso"
                >
                  <li className="flex min-w-0 items-center gap-2 rounded-lg border border-cyan-400/35 bg-cyan-500/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-cyan-100 shadow-sm shadow-cyan-500/10 max-sm:text-[10px] max-sm:tracking-tight sm:text-xs">
                    <Users className="h-3.5 w-3.5 shrink-0 text-cyan-300" aria-hidden />
                    <span className="min-w-0 leading-tight">Red Social</span>
                  </li>
                  <li className="flex min-w-0 items-center gap-2 rounded-lg border border-fuchsia-400/35 bg-fuchsia-500/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-fuchsia-100 shadow-sm shadow-fuchsia-500/10 max-sm:text-[10px] max-sm:tracking-tight sm:text-xs">
                    <Music2 className="h-3.5 w-3.5 shrink-0 text-fuchsia-300" aria-hidden />
                    <span className="min-w-0 leading-tight [font-size:95%]">Conciertos</span>
                  </li>
                  <li className="flex min-w-0 items-center gap-2 rounded-lg border border-amber-400/35 bg-amber-500/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-amber-100 shadow-sm shadow-amber-500/10 max-sm:text-[10px] max-sm:tracking-tight sm:text-xs">
                    <GraduationCap className="h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden />
                    <span className="min-w-0 leading-tight">Educación</span>
                  </li>
                  <li className="flex min-w-0 items-center gap-2 rounded-lg border border-emerald-400/35 bg-emerald-500/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-100 shadow-sm shadow-emerald-500/10 max-sm:text-[10px] max-sm:tracking-tight sm:text-xs">
                    <Store className="h-3.5 w-3.5 shrink-0 text-emerald-300" aria-hidden />
                    <span className="min-w-0 leading-tight">Tiendas</span>
                  </li>
                </ul>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-[15px]">
                  La primera <strong className="font-semibold text-cyan-200/95">Red Social Inmersiva</strong> que une los{" "}
                  <strong className="font-semibold text-fuchsia-200/95">Conciertos</strong> más impactantes,{" "}
                  <strong className="font-semibold text-amber-200/95">Educación</strong> de vanguardia y{" "}
                  <strong className="font-semibold text-emerald-200/95">Tiendas Digitales</strong> de otro nivel. Vive una
                  experiencia total en Realidad Aumentada y Mixta donde el entretenimiento, el aprendizaje y el comercio
                  convergen.
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {pillars.slice(0, 2).map((pillar, index) => (
            <motion.div
              key={pillar.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14 + index * 0.04, duration: 0.6 }}
            >
              <PillarSpotlightCard pillar={pillar} />
            </motion.div>
          ))}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.6 }}
          >
            <PillarSpotlightCard pillar={pillars[2]} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.26, duration: 0.6 }}
          >
            <PillarSpotlightCard pillar={pillars[3]} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <Card className="overflow-hidden border border-primary/35 bg-card/60 backdrop-blur-xl shadow-[0_0_45px_-14px_hsl(var(--primary)/0.8)]">
              <div className="relative h-44 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1570498839593-e565b39455fc?auto=format&fit=crop&w=1600&q=80"
                  alt={ALT_CARD_MUNDIAL_STREAMING}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/25 to-transparent" />
              </div>
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-display text-xl font-semibold text-foreground">Transmisiones Iniciales Mundial 2026</h3>
                  <span className="rounded-full border border-emerald-300/45 bg-emerald-400/15 px-3 py-1 text-xs font-display font-bold uppercase tracking-wider text-emerald-300">
                    GRATIS
                  </span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Los primeros partidos y transmisiones son gratuitos para toda la comunidad. Entra, vive la emoción del
                  Mundial 2026 y prueba la experiencia VR premium sin costo.
                </p>
                <Button
                  variant="heroOutline"
                  className="mt-5 w-full"
                  onClick={() =>
                    navigate("/inicio", {
                      state: { openFreeMatchScreen: true },
                    })
                  }
                >
                  Ver partidos gratis
                </Button>
              </CardContent>
            </Card>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default WorldCupVrHero;
