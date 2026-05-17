import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export type HomeNavCardItem = {
  label: string;
  description: string;
  path: string;
  image: string;
};

const HOME_NAV_CARDS: HomeNavCardItem[] = [
  { label: "ViveVR", description: "Experiencias inmersivas", path: "/inicio-2", image: "/onni-ecosystem-metaverse.png" },
  { label: "Salas", description: "Shows y comunidad", path: "/nuestras-salas", image: "/eventos-inmersivos.jpeg" },
  { label: "Tienda", description: "Cursos y contenido", path: "/tienda", image: "/compras-inmersivas.jpeg" },
  { label: "Quiénes somos", description: "OnniVers · Tikes", path: "/quienes-somos", image: "/accesibilidad-universal.jpeg" },
];

const CARD_CLASS =
  "flex h-[4.9rem] w-full min-w-0 flex-col overflow-hidden rounded-lg border border-border/50 bg-card/40 shadow-[0_0_20px_-10px_hsl(var(--primary)/0.4)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/45";

function HomeNavCard({ item, index }: { item: HomeNavCardItem; index: number }) {
  return (
    <motion.div
      className="min-w-0 flex-1"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link to={item.path} className={CARD_CLASS}>
        <div className="relative h-[2.6rem] w-full shrink-0 overflow-hidden border-b border-white/10">
          <img src={item.image} alt="" className="h-full w-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
        <div className="flex flex-1 flex-col items-center justify-center px-1 py-0.5 text-center">
          <p className="w-full truncate font-display text-[9px] font-semibold uppercase tracking-wide text-foreground">{item.label}</p>
          <p className="mt-0.5 w-full truncate text-[7px] leading-none text-muted-foreground">{item.description}</p>
        </div>
      </Link>
    </motion.div>
  );
}

const LEFT_CARDS = HOME_NAV_CARDS.slice(0, 2);
const RIGHT_CARDS = HOME_NAV_CARDS.slice(2, 4);

function CardRow({
  items,
  side,
  className,
}: {
  items: HomeNavCardItem[];
  side: "left" | "right";
  className?: string;
}) {
  const startIndex = side === "left" ? 0 : 2;

  return (
    <div
      className={cn(
        "pointer-events-auto flex flex-row gap-[0.4rem] sm:gap-[0.53rem]",
        side === "left"
          ? "left-[max(0.5rem,env(safe-area-inset-left))]"
          : "right-[max(0.5rem,env(safe-area-inset-right))]",
        className,
      )}
    >
      {items.map((item, i) => (
        <HomeNavCard key={item.path} item={item} index={startIndex + i} />
      ))}
    </div>
  );
}

export default function HomeNavCards({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-20 scale-[1.012]",
        className,
      )}
    >
      <CardRow
        items={LEFT_CARDS}
        side="left"
        className="absolute top-1/2 w-[min(42vw,9.5rem)] -translate-y-1/2"
      />
      <CardRow
        items={RIGHT_CARDS}
        side="right"
        className="absolute top-1/2 w-[min(42vw,9.5rem)] -translate-y-1/2"
      />
    </div>
  );
}
