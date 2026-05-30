import { AnimatePresence, motion } from "framer-motion";
import { DoorOpen, Glasses } from "lucide-react";
import { Button } from "@/components/ui/button";

export type LobbyCardAction = "OPEN_LOBBY_NATIVE" | "OPEN_LOBBY_WEB";

type LobbyCardChoiceDialogProps = {
  open: boolean;
  onSelect: (action: LobbyCardAction) => void;
  onClose: () => void;
};

/** Android: acceso al lobby desde Tierra con modal de elección. */
export function LobbyCardChoiceDialog({ open, onSelect, onClose }: LobbyCardChoiceDialogProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 12, opacity: 0 }}
            className="w-full max-w-md rounded-2xl border border-cyan-400/55 bg-card/95 p-5 shadow-[0_0_60px_-18px_rgba(34,211,238,0.45)]"
          >
            <h3 className="font-display text-xl font-bold text-foreground">Lobby</h3>
            <p className="mt-2 text-sm text-muted-foreground">Elige cómo entrar al lobby inmersivo.</p>
            <div className="mt-4 flex flex-col gap-2">
              <Button
                type="button"
                className="h-auto justify-center gap-2 border border-cyan-400/50 bg-cyan-500/15 py-3 text-cyan-50 hover:bg-cyan-500/25"
                onClick={() => onSelect("OPEN_LOBBY_NATIVE")}
              >
                <Glasses className="h-5 w-5 shrink-0" aria-hidden />
                Lobby VR nativo
              </Button>
              <Button
                type="button"
                className="h-auto justify-center gap-2 border border-violet-400/50 bg-violet-500/15 py-3 text-violet-100 hover:bg-violet-500/25"
                onClick={() => onSelect("OPEN_LOBBY_WEB")}
              >
                <DoorOpen className="h-5 w-5 shrink-0" aria-hidden />
                Lobby web
              </Button>
            </div>
            <div className="mt-3 flex justify-end">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
