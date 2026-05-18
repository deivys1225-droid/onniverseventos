import { motion } from "framer-motion";

export type SectionHeaderProps = {
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  highlight: string;
  subtitle: string;
  accent: string;
};

export default function SectionHeader({
  badge,
  icon: Icon,
  title,
  highlight,
  subtitle,
  accent,
}: SectionHeaderProps) {
  return (
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
}
