import { cn } from "@/lib/utils";
import onniRobotImg from "@/assets/—Pngtree—a robot with round head_16287334.png";

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

      <img
        src={onniRobotImg}
        alt=""
        className="onni-avatar__img relative z-[1] h-full w-auto max-w-none object-contain object-bottom drop-shadow-[0_6px_16px_rgba(0,0,0,0.45)]"
        draggable={false}
      />
    </div>
  );
}
