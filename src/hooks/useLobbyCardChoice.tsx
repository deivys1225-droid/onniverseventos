import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LobbyCardChoiceDialog, type LobbyCardAction } from "@/components/galeria3d/LobbyCardChoiceDialog";
import { LOBBY_IMMERSIVE_PATH } from "@/lib/lobbyImmersive";
import { invokeOpenLobbyDirect } from "@/lib/lobbyOpenDirect";
import { isAndroidLiveStreamChoicePlatform } from "@/lib/liveStreamOpenDirect";

/** Tierra en Android: modal para abrir lobby nativo o lobby web. */
export function useLobbyCardChoice() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const requestLobbyEntry = useCallback((): boolean => {
    if (!isAndroidLiveStreamChoicePlatform()) return false;
    setOpen(true);
    return true;
  }, []);

  const close = useCallback(() => setOpen(false), []);

  const selectAction = useCallback(
    (action: LobbyCardAction) => {
      setOpen(false);
      if (action === "OPEN_LOBBY_NATIVE") {
        if (invokeOpenLobbyDirect()) return;
      }
      navigate(LOBBY_IMMERSIVE_PATH);
    },
    [navigate],
  );

  const dialog = <LobbyCardChoiceDialog open={open} onSelect={selectAction} onClose={close} />;

  return { requestLobbyEntry, dialog };
}
