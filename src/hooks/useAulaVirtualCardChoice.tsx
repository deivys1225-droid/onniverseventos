import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AulaVirtualCardChoiceDialog,
  type AulaVirtualCardAction,
} from "@/components/galeria3d/AulaVirtualCardChoiceDialog";
import { AULA_VIRTUAL_LOBBY_PATH, openAulaVirtualLobbyOnAndroid } from "@/lib/aulaVirtual";
import { isAndroidLiveStreamChoicePlatform } from "@/lib/liveStreamOpenDirect";

/**
 * Tarjeta promocional de Aula Virtual (no el ítem del menú navbar).
 * APK: lobby VR nativo o lobby web en la app; web: enlace directo a /aula-virtual.
 */
export function useAulaVirtualCardChoice() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const requestAulaVirtualEntry = useCallback((): boolean => {
    if (!isAndroidLiveStreamChoicePlatform()) return false;
    setOpen(true);
    return true;
  }, []);

  const close = useCallback(() => setOpen(false), []);

  const selectAction = useCallback(
    (action: AulaVirtualCardAction) => {
      setOpen(false);
      if (action === "OPEN_AULA_LOBBY") {
        openAulaVirtualLobbyOnAndroid();
        return;
      }
      navigate(AULA_VIRTUAL_LOBBY_PATH);
    },
    [navigate],
  );

  const dialog = (
    <AulaVirtualCardChoiceDialog open={open} onSelect={selectAction} onClose={close} />
  );

  return { requestAulaVirtualEntry, dialog };
}
