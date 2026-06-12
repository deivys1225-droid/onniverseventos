import { useEffect } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnniAzureMic, type AzureMicCallbacks } from "@/hooks/useOnniAzureMic";

export type OpAiAndroidAzureMicState = {
  isRecording: boolean;
  isProcessing: boolean;
};

type OpAiAndroidAzureMicProps = {
  callbacks: AzureMicCallbacks;
  processing: boolean;
  panelOpen: boolean;
  onStateChange?: (state: OpAiAndroidAzureMicState) => void;
};

/** Micrófono Azure STT — solo montar en APK Android, nunca en PC/navegador. */
export default function OpAiAndroidAzureMic({
  callbacks,
  processing,
  panelOpen,
  onStateChange,
}: OpAiAndroidAzureMicProps) {
  const { isRecording, isProcessing, toggle, cancel } = useOnniAzureMic(callbacks);

  useEffect(() => {
    onStateChange?.({ isRecording, isProcessing });
  }, [isRecording, isProcessing, onStateChange]);

  useEffect(() => {
    if (!panelOpen) cancel();
  }, [panelOpen, cancel]);

  return (
    <Button
      type="button"
      size="icon"
      variant={isRecording ? "secondary" : "outline"}
      disabled={processing || isProcessing}
      onClick={() => void toggle()}
      aria-label={
        isRecording ? "Detener y enviar a Onni" : "Grabar voz — di Hola Onni y tu pedido"
      }
    >
      {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </Button>
  );
}
