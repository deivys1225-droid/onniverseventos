import { cn } from "@/lib/utils";

export type OnniAvatarState = "idle" | "listening" | "speaking";

type OnniAvatarProps = {
  size?: "sm" | "md" | "lg";
  state?: OnniAvatarState;
  className?: string;
  title?: string;
};

/** Altura del robot (ancho automático para no aplastar la figura). */
const sizeHeight = {
  sm: "h-7",
  md: "h-10",
  lg: "h-14",
} as const;

export default function OnniAvatar({ size = "md", state = "idle", className, title = "Onni" }: OnniAvatarProps) {
  return (
    <div
      className={cn("onni-avatar relative shrink-0", sizeHeight[size], className)}
      data-state={state}
      role="img"
      aria-label={title}
    >
      <span className="onni-avatar__ring pointer-events-none absolute inset-[8%] rounded-full" aria-hidden />
      <span
        className="onni-avatar__ring onni-avatar__ring--delay pointer-events-none absolute inset-[8%] rounded-full"
        aria-hidden
      />

      <svg
        viewBox="0 0 120 120"
        className="onni-avatar__img relative z-[1] h-full w-auto max-w-none object-contain object-bottom drop-shadow-[0_6px_16px_rgba(0,0,0,0.45)]"
        aria-hidden
      >
        <defs>
          <linearGradient id="onniFace" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#d8ecff" />
            <stop offset="100%" stopColor="#7bb8ff" />
          </linearGradient>
          <linearGradient id="onniBody" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5aa8ff" />
            <stop offset="100%" stopColor="#246ecf" />
          </linearGradient>
        </defs>

        <ellipse cx="60" cy="108" rx="30" ry="7" fill="rgba(0,0,0,0.25)" />
        <rect x="47" y="76" width="26" height="28" rx="10" fill="url(#onniBody)" />
        <rect x="52" y="84" width="16" height="7" rx="3.5" fill="#0a1f44" opacity="0.5" />
        <rect x="41" y="78" width="10" height="18" rx="5" fill="#5ea6ff" />
        <rect x="69" y="78" width="10" height="18" rx="5" fill="#5ea6ff" />
        <circle cx="60" cy="47" r="32" fill="url(#onniFace)" />
        <circle cx="60" cy="47" r="30" fill="none" stroke="#4a88d4" strokeWidth="2.5" />
        <rect x="41" y="35" width="38" height="22" rx="11" fill="#0e2450" />
        <circle cx="51" cy="46" r="4.5" fill="#6ef2ff" />
        <circle cx="69" cy="46" r="4.5" fill="#6ef2ff" />
        <rect x="56" y="9" width="8" height="10" rx="4" fill="#7fb9ff" />
        <circle cx="60" cy="8" r="4" fill="#6ef2ff" />
        <circle cx="46" cy="31" r="3" fill="#fff" opacity="0.38" />
      </svg>
    </div>
  );
}
