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
  "flex h-[2.85rem] w-full min-w-0 max-w-full flex-col overflow-hidden rounded-md border border-border/50 bg-card/40 shadow-[0_0_16px_-10px_hsl(var(--primary)/0.4)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/45 md:h-[4.9rem] md:rounded-lg md:shadow-[0_0_20px_-10px_hsl(var(--primary)/0.4)]";

function HomeNavCard({ item, index }: { item: HomeNavCardItem; index: number }) {
  return (
    <motion.div
      className="min-w-0 flex-1"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link to={item.path} className={CARD_CLASS}>
        <div className="relative h-[1.35rem] w-full shrink-0 overflow-hidden border-b border-white/10 md:h-[2.6rem]">
          <img src={item.image} alt="" className="h-full w-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
        <div className="flex flex-1 flex-col items-center justify-center px-0.5 py-0 text-center md:px-1 md:py-0.5">
          <p className="w-full truncate font-display text-[7px] font-semibold uppercase tracking-wide text-foreground md:text-[9px]">
            {item.label}
          </p>
          <p className="mt-0.5 hidden w-full truncate text-[6px] leading-none text-muted-foreground sm:block md:text-[7px]">
            {item.description}
          </p>
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
        "pointer-events-auto flex flex-row gap-1 md:gap-[0.4rem] lg:gap-[0.53rem]",
        side === "left"
          ? "left-[max(0.35rem,env(safe-area-inset-left))]"
          : "right-[max(0.35rem,env(safe-area-inset-right))]",
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
        "pointer-events-none absolute inset-0 z-20 max-w-full overflow-hidden md:scale-[1.012]",
        className,
      )}
    >
      <CardRow
        items={LEFT_CARDS}
        side="left"
        className="absolute top-1/2 w-[min(17.5vw,4.1rem)] -translate-y-1/2 sm:w-[min(22vw,5.25rem)] md:w-[min(42vw,9.5rem)]"
      />
      <CardRow
        items={RIGHT_CARDS}
        side="right"
        className="absolute top-1/2 w-[min(17.5vw,4.1rem)] -translate-y-1/2 sm:w-[min(22vw,5.25rem)] md:w-[min(42vw,9.5rem)]"
      />
    </div>
  );
}
