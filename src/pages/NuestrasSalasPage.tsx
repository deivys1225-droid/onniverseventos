import { motion } from "framer-motion";
import { Mic2, Radio, Box } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { podcastStreamers } from "@/data/podcastStreamers";
import { SALA_MP4_URL_BY_ID, onniverseDeepLink } from "@/data/salaVideoUrls";

const SectionHeader = ({
  badge,
  icon: Icon,
  title,
  highlight,
  subtitle,
  accent,
}: {
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  highlight: string;
  subtitle: string;
  accent: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-80px" }}
    className="mb-10 text-center"
  >
    <span
      className={`mb-5 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-display font-semibold uppercase tracking-[0.2em] ${accent}`}
    >
      <Icon className="h-4 w-4" />
      {badge}
    </span>
    <h2 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
      {title} <span className="text-gradient-neon">{highlight}</span>
    </h2>
    <p className="mx-auto mt-4 max-w-3xl text-base text-muted-foreground md:text-lg">{subtitle}</p>
  </motion.div>
);

const NuestrasSalasPage = () => {
  const creatorRooms = [
    ...podcastStreamers.map((streamer) => ({
      id: streamer.id,
      name: streamer.name,
      image: streamer.avatar,
      subtitle: streamer.immersiveSalaName,
      description: streamer.loungeTitle,
      status: streamer.status === "live" ? "En Vivo" : "Offline",
      to: `/podcast/${streamer.id}`,
      type: "podcast" as const,
    })),
    {
      id: "hablando-huevadas",
      name: "Hablando Huevadas",
      image: "/hablando-huevadas.png",
      subtitle: "Peru",
      description: "Live Show Oficial",
      status: "En Vivo",
      to: "/teatro/hablando-huevadas",
      type: "teatro" as const,
    },
    {
      id: "michael-jackson",
      name: "Michael Jackson",
      image: "/michael-jackson-avatar.png",
      subtitle: "USA",
      description: "Show inmersivo y hits eternos",
      status: "VIP",
      to: "/teatro/michael-jackson",
      type: "teatro" as const,
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <Navbar />

      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_5%,hsl(var(--primary)/0.18),transparent_35%),radial-gradient(circle_at_85%_95%,hsl(290_80%_60%/0.16),transparent_40%)]" />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      <main className="relative z-10 px-6 pt-20 pb-20">
        <div className="container mx-auto max-w-6xl">
          {/* === SALAS === */}
          <section id="podcast" className="scroll-mt-24">
            <SectionHeader
              badge="Salas Maestras"
              icon={Radio}
              title="VIVE"
              highlight="SALAS"
              subtitle="Todas las salas de creadores en una sola cuadrícula. Clic en tarjeta y entras directo."
              accent="border-primary/40 bg-primary/10 text-primary"
            />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {creatorRooms.map((room, index) => {
                const salaMp4 = SALA_MP4_URL_BY_ID[room.id];
                const onniverseAppHref =
                  salaMp4 !== undefined ? onniverseDeepLink(salaMp4) : null;

                return (
                  <motion.div
                    key={room.id}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ delay: index * 0.06 }}
                  >
                    {onniverseAppHref != null ? (
                      <a
                        href={onniverseAppHref}
                        className="group block rounded-2xl border border-border/50 bg-card/40 p-5 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-primary/50 hover:shadow-[0_0_45px_-10px_hsl(var(--primary)/0.5)]"
                      >
                        <div className="relative mb-4 overflow-hidden rounded-xl border border-primary/20">
                          <img
                            src={room.image}
                            alt={room.name}
                            className="h-44 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
                          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between rounded-lg border border-white/10 bg-black/45 px-2 py-1 text-[10px] font-display uppercase tracking-wider text-cyan-200 backdrop-blur-md">
                            <span className="flex items-center gap-1">
                              <Box className="h-3 w-3 text-primary" />
                              Sala
                            </span>
                            <span className="text-slate-300">{room.subtitle}</span>
                          </div>
                        </div>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <h3 className="font-display text-lg font-semibold text-foreground">
                            {room.name}
                          </h3>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-display font-bold uppercase tracking-wide ${
                              room.status === "En Vivo"
                                ? "bg-destructive/90 text-destructive-foreground"
                                : room.status === "VIP"
                                ? "bg-amber-500/90 text-black"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {room.status}
                          </span>
                        </div>
                        <p className="mb-4 text-sm text-muted-foreground">{room.description}</p>
                        <span className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 py-2.5 text-xs font-display font-bold uppercase tracking-wide text-primary transition group-hover:bg-primary/20 group-hover:shadow-[0_0_24px_-4px_hsl(var(--primary)/0.6)]">
                          <Mic2 className="h-4 w-4" />
                          Entrar a sala
                        </span>
                      </a>
                    ) : (
                      <Link
                        to={room.to}
                        className="group block rounded-2xl border border-border/50 bg-card/40 p-5 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-primary/50 hover:shadow-[0_0_45px_-10px_hsl(var(--primary)/0.5)]"
                      >
                    <div className="relative mb-4 overflow-hidden rounded-xl border border-primary/20">
                      <img
                        src={room.image}
                        alt={room.name}
                        className="h-44 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between rounded-lg border border-white/10 bg-black/45 px-2 py-1 text-[10px] font-display uppercase tracking-wider text-cyan-200 backdrop-blur-md">
                        <span className="flex items-center gap-1">
                          <Box className="h-3 w-3 text-primary" />
                          Sala
                        </span>
                        <span className="text-slate-300">{room.subtitle}</span>
                      </div>
                    </div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <h3 className="font-display text-lg font-semibold text-foreground">
                        {room.name}
                      </h3>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-display font-bold uppercase tracking-wide ${
                          room.status === "En Vivo"
                            ? "bg-destructive/90 text-destructive-foreground"
                            : room.status === "VIP"
                            ? "bg-amber-500/90 text-black"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {room.status}
                      </span>
                    </div>
                    <p className="mb-4 text-sm text-muted-foreground">{room.description}</p>
                    <span className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 py-2.5 text-xs font-display font-bold uppercase tracking-wide text-primary transition group-hover:bg-primary/20 group-hover:shadow-[0_0_24px_-4px_hsl(var(--primary)/0.6)]">
                      <Mic2 className="h-4 w-4" />
                      Entrar a sala
                    </span>
                      </Link>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default NuestrasSalasPage;
