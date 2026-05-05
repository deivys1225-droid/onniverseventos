import { motion } from "framer-motion";
import { Camera, PencilLine } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type ProfileCardConfirmPayload = {
  name: string;
  avatarFile: File | null;
  avatarPreviewUrl: string | null;
};

export interface ProfileCardProps {
  initialName?: string;
  /** URL inicial (ej. desde `public`). Si cambia el archivo, prevalece la vista previa local. */
  initialAvatarSrc?: string | null;
  confirmLabel?: "Guardar Cambios" | "Confirmar Perfil";
  /** Al confirmar devuelve nombre, archivo opcional y URL de objeto para previsualización. Revoca previews antiguos en el padre si aplica. */
  onConfirm?: (payload: ProfileCardConfirmPayload) => void;
  className?: string;
}

/** Tarjeta glass alineada con las salas: `rounded-2xl`, `border-border/50`, `bg-card/40`, `backdrop-blur-xl`, resplandor primary. */
const ProfileCard = ({
  initialName = "Explorador VR",
  initialAvatarSrc = "/placeholder.svg",
  confirmLabel = "Confirmar Perfil",
  onConfirm,
  className,
}: ProfileCardProps) => {
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initialName);
  const [editingName, setEditingName] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);

  const displayAvatar = avatarPreviewUrl ?? initialAvatarSrc ?? "/placeholder.svg";

  useEffect(() => {
    setName(initialName);
  }, [initialName]);

  useEffect(() => {
    setAvatarPreviewUrl((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return null;
    });
    setAvatarFile(null);
  }, [initialAvatarSrc]);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  const onPickFile = useCallback(() => {
    fileRef.current?.click();
  }, []);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setAvatarFile(file);
    setAvatarPreviewUrl((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    e.target.value = "";
  }, []);

  const handleConfirm = useCallback(() => {
    onConfirm?.({ name: name.trim() || initialName, avatarFile, avatarPreviewUrl });
  }, [avatarFile, avatarPreviewUrl, initialName, name, onConfirm]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "w-[min(92vw,280px)] select-none rounded-2xl border border-border/50 bg-card/40 p-5 shadow-[0_0_40px_-12px_hsl(var(--primary)/0.45)] backdrop-blur-xl transition-all duration-500",
        "hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[0_0_45px_-10px_hsl(var(--primary)/0.5)]",
        className,
      )}
      style={{ pointerEvents: "auto" }}
    >
      <input
        ref={fileRef}
        id={inputId}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        onChange={onFileChange}
      />

      <div className="relative mx-auto mb-4 h-28 w-28">
        <div className="absolute inset-0 rounded-full border border-primary/20 bg-black/20 shadow-[inset_0_0_20px_hsl(var(--primary)/0.12)]" />
        <img
          src={displayAvatar}
          alt=""
          className="relative z-0 h-full w-full rounded-full object-cover ring-2 ring-white/10"
        />
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="absolute -bottom-0.5 -right-0.5 z-10 h-9 w-9 rounded-full border border-primary/35 bg-background/80 text-primary shadow-[0_0_18px_-4px_hsl(var(--primary)/0.55)] backdrop-blur-md hover:bg-primary/15"
          onClick={onPickFile}
          aria-label="Cambiar foto de perfil"
        >
          <Camera className="h-4 w-4" />
        </Button>
      </div>

      <div className="mb-4 min-h-[2.5rem] text-center">
        {editingName ? (
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setEditingName(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setEditingName(false);
            }}
            className="h-9 border-primary/30 bg-black/25 text-center font-display text-base font-semibold text-foreground backdrop-blur-sm"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingName(true)}
            className="group inline-flex max-w-full items-center justify-center gap-2 rounded-lg px-2 py-1 font-display text-lg font-semibold text-foreground transition hover:bg-white/5"
          >
            <span className="truncate">{name.trim() || initialName}</span>
            <PencilLine className="h-4 w-4 shrink-0 text-primary opacity-70 group-hover:opacity-100" aria-hidden />
          </button>
        )}
      </div>

      <Button
        type="button"
        onClick={handleConfirm}
        className="w-full rounded-xl border border-primary/40 bg-primary/10 font-display text-xs font-bold uppercase tracking-wide text-primary shadow-[0_0_20px_-6px_hsl(var(--primary)/0.55)] transition hover:bg-primary/20 hover:shadow-[0_0_24px_-4px_hsl(var(--primary)/0.6)]"
        variant="outline"
      >
        {confirmLabel}
      </Button>
    </motion.div>
  );
};

export default ProfileCard;
