import NeonRoom from "@/components/lobby/NeonRoom";

/**
 * Aula Virtual — comparte controles/cámara con NeonRoom pero sin pantallas del lobby
 * (salas, web embebida, WebViews nativos). Solo decoración de aula (dinosaurios, galería).
 */
export default function AulaVirtualRoom() {
  return <NeonRoom variant="aula-virtual" />;
}
