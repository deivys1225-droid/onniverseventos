import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Ticket, MonitorPlay, Sparkles, LogIn, Users, Music2, GraduationCap, Store } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PayPalButtons } from "@paypal/react-paypal-js";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { WORLD_CUP_FINAL_USD, WORLD_CUP_SEMIFINALS_USD, formatUsd } from "@/lib/pricing";
import LoginAuthModal from "@/components/LoginAuthModal";
import PaymentSuccessModal from "@/components/PaymentSuccessModal";
import { notifyN8nPaymentSuccess } from "@/lib/n8n";

/** Arte OnniVerso (metaverso / pilares) — servido desde `public/` para web y Capacitor (`base: "./"`). */
const ONNI_ECOSYSTEM_HERO_IMAGE = `${import.meta.env.BASE_URL}onni-ecosystem-metaverse.png`;

const offers = [
  {
    kind: "final" as const,
    title: "Preventa Gran Final",
    description: "Acceso exclusivo a la final histórica",
    usd: WORLD_CUP_FINAL_USD,
    image:
      "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?auto=format&fit=crop&w=1400&q=80",
  },
];

const WorldCupOfferColumn = ({ offer, orderClass }: { offer: (typeof offers)[0]; orderClass: string }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const eventKey = offer.kind === "final" ? "worldcup-final" : "worldcup-semifinal";
  const priceStr = offer.usd.toFixed(2);

  const onCapture = async (orderId: string) => {
    try {
      await notifyN8nPaymentSuccess({
        source: offer.kind === "final" ? "worldcup-final" : "worldcup-semifinal",
        amount: priceStr,
        currency: "USD",
        userId: user?.id ?? null,
        userEmail: user?.email ?? null,
        eventId: eventKey,
        paypalOrderId: orderId,
        at: new Date().toISOString(),
      });
    } catch (e) {
      console.error("n8n notification:", e);
    }
    setSuccessOpen(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: orderClass.includes("order-1") ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.15, duration: 0.6 }}
      className={orderClass}
    >
      <LoginAuthModal
        open={loginOpen}
        onOpenChange={setLoginOpen}
        onGoToAuth={() => {
          setLoginOpen(false);
          navigate("/entrar");
        }}
      />
      <PaymentSuccessModal
        open={successOpen}
        onOpenChange={setSuccessOpen}
        message="Pago con PayPal confirmado. Pronto activaremos tu acceso según el calendario de transmisiones."
      />

      <Card className="presale-glass-card h-full">
        <div className="relative h-44 overflow-hidden">
          <img src={offer.image} alt={offer.title} className="h-full w-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
        </div>
        <CardContent className="p-5">
          <h3 className="font-display text-xl font-semibold text-foreground">{offer.title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{offer.description}</p>
          <p className="mt-4 text-2xl font-display font-bold text-primary">{formatUsd(offer.usd)}</p>
          {!user ? (
            <Button
              type="button"
              className="mt-3 w-full gap-2 rounded-lg border border-[#ffc439]/80 bg-[#ffc439] px-3 py-2 text-sm font-semibold text-[#003087] transition hover:brightness-95"
              onClick={() => setLoginOpen(true)}
            >
              <LogIn className="h-4 w-4" />
              Iniciar sesión con PayPal
            </Button>
          ) : (
            <div className="mt-3 w-full">
              <PayPalButtons
                style={{
                  layout: "vertical",
                  color: "gold",
                  shape: "rect",
                  label: "pay",
                  height: 45,
                }}
                createOrder={(_data, actions) =>
                  actions.order.create({
                    intent: "CAPTURE",
                    purchase_units: [
                      {
                        amount: { currency_code: "USD", value: priceStr },
                        description: `Preventa VR — ${offer.title}`,
                      },
                    ],
                  })
                }
                onApprove={async (_data, actions) => {
                  if (!actions.order) return;
                  const order = await actions.order.capture();
                  await onCapture(order.id ?? "");
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

const WorldCupVrHero = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[100dvh] overflow-hidden px-6 pt-24 pb-16">
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1577223625816-7546f13df25d?auto=format&fit=crop&w=2200&q=80"
          alt=""
          className="h-full w-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,hsl(190_70%_48%/.14),transparent_42%),radial-gradient(circle_at_85%_22%,hsl(270_55%_52%/.12),transparent_38%),linear-gradient(to_bottom,hsl(230_45%_8%/.45),hsl(235_40%_4%/.82))]" />
      </div>

      <div className="relative z-10 container mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75 }}
          className="mb-14 px-2 text-center md:mb-16"
        >
          <h1 className="mx-auto max-w-4xl font-headline text-[clamp(2.25rem,6vw,4rem)] font-semibold leading-[1.08] tracking-[0.14em] md:tracking-[0.2em]">
            <span className="bg-gradient-to-br from-cyan-50 via-white to-slate-200 bg-clip-text text-transparent">
              Onni
            </span>
            <span className="tracking-[0.26em] text-primary drop-shadow-[0_0_36px_hsl(175_80%_50%/0.42)]">Vers</span>
          </h1>
          <p className="font-subtitle mx-auto mt-8 max-w-xl text-[11px] font-medium uppercase tracking-[0.42em] text-muted-foreground/75 md:mt-10 md:text-xs">
            Tu Realidad Evolucionada
          </p>
        </motion.div>

        <div className="mx-auto mb-6 max-w-4xl space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.6 }}
          >
            <Card className="overflow-hidden border border-primary/35 bg-card/60 backdrop-blur-xl shadow-[0_0_45px_-14px_hsl(var(--primary)/0.8)]">
              <div className="onniverso-hero-platform-visual relative h-52 overflow-hidden bg-gradient-to-b from-[hsl(230_42%_11%)] to-[hsl(235_38%_7%)] ring-1 ring-inset ring-primary/20 md:h-56">
                <img
                  src={ONNI_ECOSYSTEM_HERO_IMAGE}
                  alt="Ecosistema OnniVerso: conciertos, educación, tiendas digitales y red social inmersiva en VR y hologramas"
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
                    OnniVerso: El Ecosistema Digital Infinito.
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

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.6 }}
          >
            <Card className="overflow-hidden border border-primary/35 bg-card/60 backdrop-blur-xl shadow-[0_0_45px_-14px_hsl(var(--primary)/0.8)]">
              <div className="relative h-44 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1570498839593-e565b39455fc?auto=format&fit=crop&w=1600&q=80"
                  alt="Fútbol colombiano en estadio"
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-stretch">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.7 }}
            className="lg:order-1"
          >
            <Card className="h-full border border-primary/45 bg-card/65 backdrop-blur-xl shadow-[0_0_60px_-15px_hsl(var(--primary)/0.9)]">
              <CardContent className="p-7 md:p-8">
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs font-display font-semibold tracking-wider text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  MUNDIAL VR EXPERIENCE
                </span>
                <h2 className="mt-4 font-display text-2xl font-bold text-foreground md:text-3xl">
                  Transmisión total del Mundial en realidad virtual
                </h2>

                <div className="mt-6 space-y-4">
                  <div className="rounded-xl border border-primary/35 bg-primary/10 p-4">
                    <p className="flex items-start gap-2 text-sm md:text-base text-foreground">
                      <MonitorPlay className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      Disfruta de una pantalla virtual de 100 pulgadas para todos los partidos.
                    </p>
                  </div>
                  <div className="rounded-xl border border-amber-300/35 bg-amber-300/10 p-4">
                    <p className="flex items-start gap-2 text-sm md:text-base text-foreground">
                      <Ticket className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                      Ahorra dinero en boletas y vive la pasión desde la primera fila virtual.
                    </p>
                  </div>
                  <div className="rounded-xl border border-cyan-300/35 bg-cyan-300/10 p-4">
                    <p className="flex items-start gap-2 text-sm md:text-base text-foreground">
                      <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                      Los partidos de fase de grupos y octavos son GRATIS. Semifinales y Gran Final:{" "}
                      {formatUsd(WORLD_CUP_SEMIFINALS_USD)} y {formatUsd(WORLD_CUP_FINAL_USD)}.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <WorldCupOfferColumn offer={offers[0]} orderClass="lg:order-2" />
        </div>
      </div>
    </section>
  );
};

export default WorldCupVrHero;
