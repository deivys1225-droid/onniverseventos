import { Camera, MonitorPlay } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type HomeSocialCinePickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onPickCine: () => void;
  onPickCineCam: () => void;
};

export default function HomeSocialCinePickerDialog({
  open,
  onOpenChange,
  title,
  onPickCine,
  onPickCineCam,
}: HomeSocialCinePickerDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-xs">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="sr-only">Elige Cine o Cine Cam</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          <AlertDialogAction
            type="button"
            className="inline-flex w-full items-center justify-center gap-2"
            onClick={onPickCine}
          >
            <MonitorPlay className="h-4 w-4 shrink-0" aria-hidden />
            Cine
          </AlertDialogAction>
          <AlertDialogAction
            type="button"
            className="inline-flex w-full items-center justify-center gap-2"
            onClick={onPickCineCam}
          >
            <Camera className="h-4 w-4 shrink-0" aria-hidden />
            Cine Cam
          </AlertDialogAction>
          <AlertDialogCancel type="button" className="w-full">
            Cancelar
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
