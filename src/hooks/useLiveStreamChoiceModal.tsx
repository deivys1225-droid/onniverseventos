import { useCallback, useState } from "react";
import { LiveStreamChoiceDialog } from "@/components/streaming/LiveStreamChoiceDialog";
import {
  buildLiveStreamChoicePayload,
  invokeOpenStreamDirect,
  isAndroidLiveStreamChoicePlatform,
  type LiveStreamChoicePayload,
  type LiveStreamDirectAction,
} from "@/lib/liveStreamOpenDirect";
import type { ActiveStreamRow } from "@/lib/salaRoomCards";
import { toast } from "sonner";

export function useLiveStreamChoiceModal() {
  const [choice, setChoice] = useState<LiveStreamChoicePayload | null>(null);

  const requestChoice = useCallback((activeStream: ActiveStreamRow, title: string): boolean => {
    if (!isAndroidLiveStreamChoicePlatform()) return false;
    const payload = buildLiveStreamChoicePayload(activeStream, title);
    if (!payload) {
      toast.error("Falta URL .m3u8 de Mux.");
      return true;
    }
    setChoice(payload);
    return true;
  }, []);

  const closeChoice = useCallback(() => setChoice(null), []);

  const selectAction = useCallback(
    (action: LiveStreamDirectAction) => {
      if (!choice) return;
      invokeOpenStreamDirect(choice.m3u8Url, action);
      setChoice(null);
    },
    [choice],
  );

  const dialog = (
    <LiveStreamChoiceDialog choice={choice} onSelect={selectAction} onClose={closeChoice} />
  );

  return { requestChoice, dialog, closeChoice };
}
