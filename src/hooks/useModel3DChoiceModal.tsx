import { useCallback, useState } from "react";
import { Model3DChoiceDialog } from "@/components/galeria3d/Model3DChoiceDialog";
import {
  buildModel3DChoicePayload,
  invokeOpenModelDirect,
  shouldHandoffModel3DOnAndroid,
  type Model3DChoicePayload,
  type Model3DDirectAction,
} from "@/lib/model3dOpenDirect";

/** Solo modelos .glb en APK: modal de visor (puente legacy; acciones abren Aula Virtual nativa). */
export function useModel3DChoiceModal() {
  const [choice, setChoice] = useState<Model3DChoicePayload | null>(null);

  const requestModelChoice = useCallback(
    (model: { modelUrl: string; title: string }): boolean => {
      if (!shouldHandoffModel3DOnAndroid(model.modelUrl)) return false;
      const payload = buildModel3DChoicePayload(model);
      if (!payload) {
        return false;
      }
      setChoice(payload);
      return true;
    },
    [],
  );

  const closeChoice = useCallback(() => setChoice(null), []);

  const selectAction = useCallback(
    (action: Model3DDirectAction) => {
      if (!choice) return;
      invokeOpenModelDirect(choice.glbUrl, action);
      setChoice(null);
    },
    [choice],
  );

  const dialog = <Model3DChoiceDialog choice={choice} onSelect={selectAction} onClose={closeChoice} />;

  return { requestModelChoice, dialog, closeChoice };
}
