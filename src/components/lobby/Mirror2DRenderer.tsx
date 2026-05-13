import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * MODO "2D ESPEJO" — split lateral idéntico, sin stereo, sin gyro.
 *
 * Qué hace:
 *  - Divide el canvas en dos mitades verticales iguales.
 *  - Renderiza la MISMA escena, con la MISMA cámara (sin offset estéreo),
 *    en cada mitad. Resultado: dos vistas EXACTAMENTE IGUALES, una al
 *    lado de la otra. Es un espejo plano, no un par estereoscópico.
 *
 * Por qué este componente y no `StereoEffect`:
 *  - `StereoEffect` aplica un offset entre los dos ojos (separación
 *    interpupilar) para crear paralaje 3D. El usuario quiere "exactamente
 *    igual", sin paralaje. StereoEffect rompería eso.
 *  - Aquí usamos UNA sola cámara virtual con aspect ajustado a media
 *    pantalla, y dibujamos su salida dos veces.
 *
 * Estrategia para "0 lag":
 *  - `useFrame(callback, 1)`: con priority > 0, R3F deja de auto-renderear
 *    y nosotros llamamos `gl.render(scene, mirrorCamera)` dos veces por
 *    frame. No hay captura intermedia, no hay RenderTargets, no hay
 *    sincronización extra. El costo GPU se duplica pero la latencia
 *    perceptual es la misma que en mono.
 *  - Usamos una `mirrorCamera` clonada (NO modificamos la cámara
 *    principal de R3F), así drei `<Html transform>` y el resto del lobby
 *    siguen viendo la cámara full-screen original sin reflows de DOM.
 *  - `scissorTest + viewport` limita cada draw a su mitad. Es el método
 *    que usa internamente `THREE.StereoEffect`, así que el coste es el
 *    mínimo posible para split-screen.
 *
 * Side-effects al desmontar:
 *  - Restauramos `scissorTest=false` y el viewport completo. Si no, el
 *    próximo render de R3F (mono normal) saldría limitado a la última
 *    mitad y se vería negro o cortado.
 */
export function Mirror2DRenderer() {
  const { gl, scene, camera, size } = useThree();
  const sizeRef = useRef(size);
  sizeRef.current = size;

  // Cámara virtual que copia la principal cada frame y ajusta aspect a
  // la proporción de media pantalla. Esto evita la distorsión horizontal
  // que tendríamos si renderizáramos la cámara full-screen sobre un
  // viewport con la mitad del ancho.
  const mirrorCamera = useMemo(() => new THREE.PerspectiveCamera(), []);

  useEffect(() => {
    return () => {
      gl.setScissorTest(false);
      gl.setScissor(0, 0, sizeRef.current.width, sizeRef.current.height);
      gl.setViewport(0, 0, sizeRef.current.width, sizeRef.current.height);
    };
  }, [gl]);

  useFrame(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) {
      gl.render(scene, camera);
      return;
    }

    const halfW = Math.max(1, Math.floor(size.width / 2));
    const fullH = Math.max(1, size.height);

    // Sincroniza la mirrorCamera con la principal (posición + rotación +
    // intrínsecos), pero con aspect ratio de media pantalla.
    mirrorCamera.position.copy(camera.position);
    mirrorCamera.quaternion.copy(camera.quaternion);
    mirrorCamera.fov = camera.fov;
    mirrorCamera.near = camera.near;
    mirrorCamera.far = camera.far;
    mirrorCamera.aspect = halfW / fullH;
    mirrorCamera.updateProjectionMatrix();
    mirrorCamera.updateMatrixWorld();

    gl.setScissorTest(true);

    // Mitad izquierda
    gl.setViewport(0, 0, halfW, fullH);
    gl.setScissor(0, 0, halfW, fullH);
    gl.render(scene, mirrorCamera);

    // Mitad derecha — misma cámara → imagen idéntica píxel a píxel
    gl.setViewport(halfW, 0, halfW, fullH);
    gl.setScissor(halfW, 0, halfW, fullH);
    gl.render(scene, mirrorCamera);

    gl.setScissorTest(false);
  }, 1);

  return null;
}
