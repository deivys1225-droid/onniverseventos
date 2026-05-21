import { AnimatePresence, motion } from "framer-motion";
import { MonitorPlay, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LiveStreamChoicePayload, LiveStreamDirectAction } from "@/lib/liveStreamOpenDirect";

type LiveStreamChoiceDialogProps = {
  choice: LiveStreamChoicePayload | null;
  onSelect: (action: LiveStreamDirectAction) => void;
  onClose: () => void;
};

export function LiveStreamChoiceDialog({ choice, onSelect, onClose }: LiveStreamChoiceDialogProps) {
  return (
    <AnimatePresence>
      {choice ? (
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
            className="w-full max-w-md rounded-2xl border border-amber-300/55 bg-card/95 p-5 shadow-[0_0_60px_-18px_rgba(250,204,21,0.95)]"
          >
            <h3 className="font-display text-xl font-bold text-foreground">EN VIVO</h3>
            <p className="mt-2 text-sm text-muted-foreground">{choice.title}</p>
            <p className="mt-1 text-xs text-amber-200">Elige modo de reproducción:</p>
            <div className="mt-4 flex flex-col gap-2">
              <Button
                type="button"
                className="h-auto justify-center gap-2 border border-cyan-400/50 bg-cyan-500/15 py-3 text-cyan-50 hover:bg-cyan-500/25"
                onClick={() => onSelect("OPEN_STREAM")}
              >
                <MonitorPlay className="h-5 w-5 shrink-0" aria-hidden />
                STREAM (Cine)
              </Button>
              <Button
                type="button"
                className="h-auto justify-center gap-2 border border-violet-400/50 bg-violet-500/15 py-3 text-violet-100 hover:bg-violet-500/25"
                onClick={() => onSelect("OPEN_STREAM_CAM")}
              >
                <Video className="h-5 w-5 shrink-0" aria-hidden />
                STREAM CAM (Realidad mixta)
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
