import { useId } from "react";

/**
 * Marca OnniVerso — icono esférico + texto legible para SEO y lectores de pantalla.
 */
type OnniVersoLogoProps = {
  className?: string;
  /** Altura del icono (px aprox.) */
  iconSize?: number;
};

const OnniVersoLogo = ({ className = "", iconSize = 28 }: OnniVersoLogoProps) => {
  const rid = useId().replace(/:/g, "");
  const gradId = `onni-grad-${rid}`;

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 48 48"
        className="shrink-0"
        aria-hidden
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(190 95% 55%)" />
            <stop offset="100%" stopColor="hsl(270 75% 58%)" />
          </linearGradient>
        </defs>
        <circle cx="24" cy="24" r="21" fill="none" stroke={`url(#${gradId})`} strokeWidth="2.2" opacity="0.95" />
        <ellipse cx="24" cy="24" rx="21" ry="10" fill="none" stroke={`url(#${gradId})`} strokeWidth="1.4" opacity="0.65" />
        <circle cx="24" cy="24" r="7" fill="hsl(190 90% 52% / 0.25)" stroke={`url(#${gradId})`} strokeWidth="1.5" />
      </svg>
      <span className="font-display font-bold text-lg tracking-tight text-foreground md:text-xl">
        Onni<span className="text-primary">Verso</span>
      </span>
    </span>
  );
};

export default OnniVersoLogo;
