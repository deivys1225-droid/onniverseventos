import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { subscribeVirtualCursorMove } from "@/lib/virtualCursorPosition";

const LOOK_SENSITIVITY = 0.0045;

type VirtualCursorLookProps = {
  enabled: boolean;
};

/** En móvil: la cámara sigue el movimiento del cursor virtual. */
export default function VirtualCursorLook({ enabled }: VirtualCursorLookProps) {
  const { camera } = useThree();

  useEffect(() => {
    if (!enabled) return;

    return subscribeVirtualCursorMove((_x, _y, prevX, prevY) => {
      const dx = _x - prevX;
      const dy = _y - prevY;
      if (dx === 0 && dy === 0) return;

      camera.rotation.order = "YXZ";
      camera.rotation.y -= dx * LOOK_SENSITIVITY;
      camera.rotation.x = THREE.MathUtils.clamp(
        camera.rotation.x - dy * LOOK_SENSITIVITY,
        -1.35,
        1.35,
      );
      camera.up.set(0, 1, 0);
    });
  }, [camera, enabled]);

  return null;
}
