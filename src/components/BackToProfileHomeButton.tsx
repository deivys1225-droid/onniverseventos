import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BackToProfileHomeButtonProps = {
  className?: string;
  /** Solo flecha, estilo cristal oscuro. */
  iconOnly?: boolean;
};

/** Regresa a la pantalla de inicio con perfil y Tierra (`/`). */
export default function BackToProfileHomeButton({ className, iconOnly }: BackToProfileHomeButtonProps) {
  const navigate = useNavigate();

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={() => navigate("/")}
        aria-label="Volver al inicio del perfil"
        className={cn(
          "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          "border border-white/20 bg-slate-950/80 text-white shadow-[0_4px_24px_rgba(0,0,0,0.35)] backdrop-blur-md",
          "transition hover:border-white/30 hover:bg-slate-900/90 active:scale-95",
          className,
        )}
      >
        <ArrowLeft className="h-5 w-5" strokeWidth={2.25} aria-hidden />
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant="heroOutline"
      className={cn("w-full gap-2 sm:w-auto", className)}
      onClick={() => navigate("/")}
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      Volver al inicio del perfil
    </Button>
  );
}
