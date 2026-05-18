export type VirtualCursorMoveListener = (
  x: number,
  y: number,
  prevX: number,
  prevY: number,
) => void;

const listeners = new Set<VirtualCursorMoveListener>();
let lastX = -1;
let lastY = -1;

export function publishVirtualCursorMove(x: number, y: number) {
  const prevX = lastX < 0 ? x : lastX;
  const prevY = lastY < 0 ? y : lastY;
  lastX = x;
  lastY = y;
  listeners.forEach((listener) => listener(x, y, prevX, prevY));
}

export function subscribeVirtualCursorMove(listener: VirtualCursorMoveListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetVirtualCursorPosition() {
  lastX = -1;
  lastY = -1;
}
