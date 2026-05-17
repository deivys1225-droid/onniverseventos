import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BackToProfileHomeButtonProps = {
  className?: string;
};

/** Regresa a la pantalla de inicio con perfil y Tierra (`/`). */
export default function BackToProfileHomeButton({ className }: BackToProfileHomeButtonProps) {
  const navigate = useNavigate();

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
