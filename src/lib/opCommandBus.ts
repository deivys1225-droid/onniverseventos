export type OpCommand =
  | { type: "ui.menu.open" }
  | { type: "ui.menu.close" }
  | { type: "ui.menu.toggle" }
  | { type: "lobby.focusScreen"; screen: 2 | 3 | 4 }
  | { type: "lobby.unfocusScreen" }
  | { type: "lobby.gyro.enable" }
  | { type: "lobby.gyro.disable" }
  | { type: "lobby.gyro.toggle" }
  | { type: "lobby.gyro.recenter" };

const EVENT_NAME = "onniverso:op-command";

function getTarget(): EventTarget | null {
  if (typeof window === "undefined") return null;
  return window;
}

export function dispatchOpCommand(command: OpCommand) {
  const target = getTarget();
  if (!target) return;
  target.dispatchEvent(new CustomEvent<OpCommand>(EVENT_NAME, { detail: command }));
}

export function onOpCommand(handler: (command: OpCommand) => void) {
  const target = getTarget();
  if (!target) return () => {};

  const listener = (event: Event) => {
    const custom = event as CustomEvent<OpCommand>;
    if (!custom?.detail) return;
    handler(custom.detail);
  };

  target.addEventListener(EVENT_NAME, listener);
  return () => target.removeEventListener(EVENT_NAME, listener);
}

