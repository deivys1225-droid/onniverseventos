import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type HomeSocialIconConfig,
  type HomeSocialRedesMode,
  updateHomeSocialUrl,
} from "@/lib/homeSocialRedesConfig";
import { openHomeSocialRedes, openHomeSocialRedesCam } from "@/lib/homeSocialRedesOpen";

type HomeSocialRedesConfigDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: HomeSocialRedesMode;
  icons: HomeSocialIconConfig[];
  onSave: (icons: HomeSocialIconConfig[]) => void;
};

export default function HomeSocialRedesConfigDialog({
  open,
  onOpenChange,
  mode,
  icons,
  onSave,
}: HomeSocialRedesConfigDialogProps) {
  const [draft, setDraft] = useState(icons);
  const isCam = mode === "redesCam";
  const title = isCam ? "Redes Cam" : "Redes";
  const urlKey = isCam ? "redesCamUrl" : "redesUrl";

  useEffect(() => {
    if (open) setDraft(icons);
  }, [open, icons]);

  const handleSave = () => {
    onSave(draft);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(88vh,640px)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">
            URLs por red social
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {draft.map((row) => (
            <div key={row.id} className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
              <Label htmlFor={`${mode}-${row.id}`} className="text-sm font-semibold">
                {row.label}
              </Label>
              <Input
                id={`${mode}-${row.id}`}
                type="url"
                value={row[urlKey]}
                onChange={(e) =>
                  setDraft((prev) => updateHomeSocialUrl(prev, row.id, mode, e.target.value))
                }
                placeholder="https://"
                className="font-mono text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  const url = row[urlKey];
                  if (isCam) openHomeSocialRedesCam(url);
                  else openHomeSocialRedes(url);
                }}
              >
                Probar {row.label}
              </Button>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" variant="hero" onClick={handleSave}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
