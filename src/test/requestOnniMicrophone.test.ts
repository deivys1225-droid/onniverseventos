import { afterEach, describe, expect, it, vi } from "vitest";
import { requestOnniMicrophoneAccess } from "@/lib/requestOnniMicrophone";

describe("requestOnniMicrophoneAccess", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete window.AndroidBridge;
  });

  it("usa AndroidBridge cuando existe", async () => {
    window.AndroidBridge = {
      requestOnniMicrophonePermission: (cb) => {
        const fn = (window as Window & Record<string, (g: boolean) => void>)[cb];
        fn?.(true);
      },
    };
    await expect(requestOnniMicrophoneAccess()).resolves.toBe("granted");
  });

  it("getUserMedia concedido en web", async () => {
    const stop = vi.fn();
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] }),
      },
    });
    await expect(requestOnniMicrophoneAccess()).resolves.toBe("granted");
    expect(stop).toHaveBeenCalled();
  });
});
