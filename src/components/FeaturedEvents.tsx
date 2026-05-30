import { motion } from "framer-motion";
import { Box, Calendar, Eye, Landmark, Ticket } from "lucide-react";
import { useCallback } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { COLOSSEO_PATH } from "@/data/coliseoScene";
import { invokeOpenColiceoDirect } from "@/lib/coliseoOpenDirect";
import { formatUsd, stableUsdInRange } from "@/lib/pricing";

/** Rutas reales de la app: hub teatro, eventos Supabase por id, podcast hub, educación. */
const FeaturedEvents = () => {
  const navigate = useNavigate();
  const handleColiseoOpen = useCallback(() => {
    if (invokeOpenColiceoDirect()) return;
    navigate(COLOSSEO_PATH);
  }, [navigate]);

  const events = [
    {
      id: "featured-coliseo-360",
      title: "COLISEO ROMANO 360°",
      genre: "Esfera inmersiva · Panorama del anfiteatro · YouTube flotante",
      date: "Siempre disponible · Sala esférica",
      viewers: "Explora en 360°",
      image: "/coliseo.jpg",
      live: true,
      isFree: true,
      ctaLabel: "Entrar al Coliseo",
      to: "/coliseo",
      featuredIcon: Landmark,
      badge360: true,
    },
    {
      id: "featured-coliseo-360-bridge",
      title: "COLISEO ROMANO 360° · Acceso directo",
      genre: "Tarjeta espejo del ícono Coliseo · Mismo puente Android",
      date: "Siempre disponible · Apertura por puente nativo",
      viewers: "Mismo flujo del icono",
      image: "/coliseo.jpg",
      live: true,
      isFree: true,
      ctaLabel: "Abrir Coliseo (puente)",
      to: "/coliseo",
      featuredIcon: Landmark,
      badge360: true,
      openWithColiseoBridge: true,
    },
    {
      id: "a1b2c3d4-0003-4000-8000-000000000003",
      title: "STAND-UP / TEATRO Royale OnniVers",
      genre: "Comedia & teatro en vivo · Platea inmersiva · Gala premium sin barreras",
      date: "8 Mayo 2026 · Sala Royale · Distrito Premium",
      viewers: "31.4K en sala",
      image:
        "https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=1600&q=80",
      live: true,
      isFree: true,
      anchorId: "en-vivo",
      ctaLabel: "Entrar al Teatro Hub",
      to: "/teatro-hub",
    },
    {
      id: "a1b2c3d4-0001-4000-8000-000000000001",
      title: "NEÓN PRIME Mainstage",
      genre: "Electrónica · Festival central · Escenario VR & luces sincronizadas",
      date: "15 Mayo 2026 · Valle Neón · Mainstage 360°",
      viewers: "58.2K conectados",
      image:
        "https://images.unsplash.com/photo-1470229538611-16ba8c7ffbd7?auto=format&fit=crop&w=1600&q=80",
      live: true,
      isFree: false,
      ctaLabel: "Ver evento",
      to: "/event/a1b2c3d4-0001-4000-8000-000000000001",
    },
    {
      id: "a1b2c3d4-0002-4000-8000-000000000002",
      title: "CRÁTER ROCK ARENA",
      genre: "Rock · Arena en vivo · Energía de estadio en pantalla inmersiva",
      date: "22 Mayo 2026 · Arena Cráter · Full House",
      viewers: "36.9K conectados",
      image:
        "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1600&q=80",
      live: false,
      isFree: false,
      anchorId: "vr",
      ctaLabel: "Ver evento",
      to: "/event/a1b2c3d4-0002-4000-8000-000000000002",
    },
    {
      id: "featured-podcast-hub",
      title: "PODCAST HUB 360°",
      genre: "Salas esféricas · Voces en vivo · Chat y panorama sincronizado",
      date: "Siempre disponible · Lobby planetario",
      viewers: "Explora podcasters",
      image:
        "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?auto=format&fit=crop&w=1600&q=80",
      live: true,
      isFree: true,
      ctaLabel: "Ir al Podcast Hub",
      to: "/podcast-hub",
    },
    {
      id: "featured-educacion",
      title: "CAMPUS INMERSIVO OnniVers",
      genre: "Educación · RA & laboratorios virtuales · Desde tu móvil",
      date: "Programación abierta · Aulas conectadas",
      viewers: "Aprendizaje experiencial",
      image:
        "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1600&q=80",
      live: false,
      isFree: true,
      ctaLabel: "Ir a Educación",
      to: "/educacion",
    },
  ];

  return (
    <section id="eventos" aria-labelledby="eventos-destacados-titulo" className="py-10 px-4 md:px-6">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 id="eventos-destacados-titulo" className="text-4xl md:text-5xl font-display font-bold mb-4">
            Eventos <span className="text-primary">destacados</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Conciertos, podcast inmersivo, teatro y educación en un solo lugar
          </p>
        </motion.div>

        <div className="grid max-w-6xl mx-auto grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 md:gap-8">
          {events.map((event, i) => {
            const paidUsd = !event.isFree
              ? stableUsdInRange(`featured-event:${event.id}`, 10, 15)
              : 0;
            const href = event.to ?? `/event/${event.id}`;
            const card = (
              <motion.div
                id={event.anchorId}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group glass rounded-xl overflow-hidden cursor-pointer hover:border-primary/30 transition-all duration-500 h-full flex flex-col"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={event.image}
                    alt={`${event.title} — ${event.genre}`}
                    loading="lazy"
                    width={800}
                    height={600}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                  {event.live && (
                    <span className="absolute top-2 left-2 sm:top-4 sm:left-4 flex items-center gap-1 px-2 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-display font-semibold bg-destructive/90 text-destructive-foreground rounded-full">
                      <span className="w-1.5 h-1.5 bg-destructive-foreground rounded-full animate-pulse-glow" />
                      EN VIVO
                    </span>
                  )}
                  {"badge360" in event && event.badge360 && (
                    <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-lg border border-amber-400/40 bg-black/55 px-2 py-1 text-[10px] font-display uppercase tracking-wider text-amber-100 backdrop-blur-md">
                      {"featuredIcon" in event && event.featuredIcon ? (
                        <event.featuredIcon className="h-3 w-3 text-amber-300" />
                      ) : (
                        <Box className="h-3 w-3 text-amber-300" />
                      )}
                      Esfera 360°
                    </span>
                  )}
                  <span
                    className={`absolute top-2 right-2 sm:top-4 sm:right-4 flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-sm font-display font-semibold rounded-full ${
                      event.isFree
                        ? "bg-green-500/90 text-foreground"
                        : "bg-primary/90 text-primary-foreground"
                    }`}
                  >
                    <Ticket className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                    {event.isFree ? "Gratuito" : formatUsd(paidUsd)}
                  </span>
                </div>
                <div className="p-3 sm:p-6 flex-1 flex flex-col">
                  <span className="text-[10px] sm:text-xs font-display text-primary tracking-wider uppercase line-clamp-3">
                    {event.genre}
                  </span>
                  <h3 className="text-sm sm:text-xl font-display font-semibold mt-1.5 sm:mt-2 mb-2 sm:mb-4 text-foreground line-clamp-3">
                    {event.title}
                  </h3>
                  <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4 text-[11px] sm:text-sm text-muted-foreground mt-auto">
                    <span className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                      <Calendar className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                      <span className="truncate sm:line-clamp-none">{event.date}</span>
                    </span>
                    <span className="hidden sm:flex items-center gap-1.5 min-w-0">
                      <Eye className="w-4 h-4 shrink-0" />
                      <span className="truncate">{event.viewers}</span>
                    </span>
                  </div>
                  <Button variant="heroOutline" size="sm" className="mt-3 sm:mt-5 w-full text-[11px] sm:text-sm h-8 sm:h-9">
                    {event.ctaLabel ?? "Ver evento"}
                  </Button>
                </div>
              </motion.div>
            );

            if ("openWithColiseoBridge" in event && event.openWithColiseoBridge) {
              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={handleColiseoOpen}
                  className="text-left"
                  aria-label="Abrir Coliseo con puente nativo"
                >
                  {card}
                </button>
              );
            }

            return (
              <Link key={event.id} to={href}>
                {card}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturedEvents;
