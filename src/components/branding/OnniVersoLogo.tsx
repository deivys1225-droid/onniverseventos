import { useId } from "react";
import { BRAND_IMAGE_ALT } from "@/lib/seoBrand";

/**
 * Marca OnniVers — icono esférico + texto legible para SEO y lectores de pantalla.
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
    <span className={`inline-flex min-w-0 items-center gap-1.5 sm:gap-2 ${className}`} role="img" aria-label={BRAND_IMAGE_ALT}>
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
      <span
        aria-hidden
        className="whitespace-nowrap font-headline text-base font-semibold tracking-[0.12em] text-foreground sm:text-lg sm:tracking-[0.14em] md:text-xl md:tracking-[0.16em]"
      >
        Onni<span className="font-bold tracking-[0.22em] text-primary">Vers</span>
      </span>
    </span>
  );
};

export default OnniVersoLogo;
