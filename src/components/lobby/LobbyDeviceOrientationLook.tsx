import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Quaternion } from "three";
import {
  applyDeviceOrientationToCamera,
  readScreenOrientationDeg,
} from "@/lib/deviceOrientationCamera";

const HEAD_SMOOTHING_RATE_HZ = 10;

type LobbyDeviceOrientationLookProps = {
  enabled: boolean;
};

/**
 * Mirada con giroscopio en un solo viewport (sin StereoEffect ni pantalla partida).
 */
export default function LobbyDeviceOrientationLook({ enabled }: LobbyDeviceOrientationLookProps) {
  const { camera } = useThree();
  const orientationRef = useRef<DeviceOrientationEvent | null>(null);
  const targetQuatRef = useRef(new Quaternion());
  const isFirstFrameRef = useRef(true);

  useEffect(() => {
    if (!enabled) {
      orientationRef.current = null;
      return;
    }

    camera.rotation.reorder("YXZ");
    isFirstFrameRef.current = true;

    const onOrientation = (event: DeviceOrientationEvent) => {
      orientationRef.current = event;
    };
    window.addEventListener("deviceorientation", onOrientation, true);

    return () => {
      window.removeEventListener("deviceorientation", onOrientation, true);
      orientationRef.current = null;
    };
  }, [camera, enabled]);

  useFrame((_, delta) => {
    if (!enabled) return;

    const evt = orientationRef.current;
    if (evt?.alpha == null || evt.beta == null || evt.gamma == null) return;

    applyDeviceOrientationToCamera(
      targetQuatRef.current,
      evt.alpha,
      evt.beta,
      evt.gamma,
      readScreenOrientationDeg(),
    );

    if (isFirstFrameRef.current) {
      camera.quaternion.copy(targetQuatRef.current);
      isFirstFrameRef.current = false;
    } else {
      const factor = 1 - Math.exp(-HEAD_SMOOTHING_RATE_HZ * delta);
      camera.quaternion.slerp(targetQuatRef.current, factor);
    }

    camera.up.set(0, 1, 0);
  });

  return null;
}
