import { useCallback } from "react";
import {
  invokeOpenModelDirect,
  shouldHandoffModel3DOnAndroid,
} from "@/lib/model3dOpenDirect";

/** En Android abre Aula Virtual nativa al instante; en web no muestra modal (flujo AR en grid). */
export function useModel3DChoiceModal() {
  const requestModelChoice = useCallback(
    (model: { modelUrl: string; title: string }): boolean => {
      if (!shouldHandoffModel3DOnAndroid(model.modelUrl)) return false;
      invokeOpenModelDirect();
      return true;
    },
    [],
  );

  return { requestModelChoice, dialog: null, closeChoice: () => {} };
}
