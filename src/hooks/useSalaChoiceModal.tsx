import { useCallback, useState } from "react";
import { SalaChoiceDialog } from "@/components/salas/SalaChoiceDialog";
import {
  buildSalaChoicePayload,
  invokeOpenSalaDirect,
  type SalaChoicePayload,
  type SalaDirectAction,
} from "@/lib/salaOpenDirect";
import type { ActiveStreamRow, RoomCard } from "@/lib/salaRoomCards";

export function useSalaChoiceModal() {
  const [choice, setChoice] = useState<SalaChoicePayload | null>(null);

  const requestSalaChoice = useCallback(
    (room: RoomCard, activeStream: ActiveStreamRow | null | undefined, title: string): boolean => {
      const payload = buildSalaChoicePayload(room, activeStream, title);
      if (!payload) return false;
      setChoice(payload);
      return true;
    },
    [],
  );

  const closeChoice = useCallback(() => setChoice(null), []);

  const selectAction = useCallback(
    (action: SalaDirectAction) => {
      if (!choice) return;
      invokeOpenSalaDirect(choice.salaUrl, action);
      setChoice(null);
    },
    [choice],
  );

  const dialog = <SalaChoiceDialog choice={choice} onSelect={selectAction} onClose={closeChoice} />;

  return { requestSalaChoice, dialog, closeChoice };
}
