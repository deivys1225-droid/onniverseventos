import { describe, expect, it } from "vitest";
import { resolveOpCommand } from "@/lib/opAssistantResolver";

describe("resolveOpCommand", () => {
  it("abre un video va a conciertos, no a espectador", () => {
    const r = resolveOpCommand("abre un video", "/");
    expect(r.navigateTo).toBe("/nuestras-salas");
  });

  it("reproductor mp4 va a reproductor-galeria", () => {
    const r = resolveOpCommand("reproductor mp4", "/");
    expect(r.navigateTo).toBe("/reproductor-galeria");
  });

  it("video de karol va a sala nova-byte", () => {
    const r = resolveOpCommand("entra al video de karol", "/");
    expect(r.navigateTo).toContain("al-universo-nova-byte");
  });

  it("detecta falsos positivos en frases comunes", () => {
    const phrases = [
      "abre un video",
      "abre video",
      "abre el video",
      "quiero ver un video",
      "entra al video",
      "llevame a ver video",
      "video local",
      "mp4",
      "reproductor local",
      "abre un video por favor",
      "pon un video",
      "muestrame un video",
    ];
    for (const phrase of phrases) {
      const r = resolveOpCommand(phrase, "/");
      if (r.navigateTo?.includes("/sala/espectador/")) {
        throw new Error(`"${phrase}" navegó a espectador: ${r.navigateTo}`);
      }
    }
  });

  it("desde espectador, abre un video va a conciertos (no reentrar karol)", () => {
    const r = resolveOpCommand("abre un video", "/sala/espectador/al-universo-nova-byte");
    expect(r.navigateTo).toBe("/nuestras-salas");
  });

  it("desde espectador, reproductor mp4 va a galeria local", () => {
    const r = resolveOpCommand("reproductor mp4", "/sala/espectador/al-universo-nova-byte");
    expect(r.navigateTo).toBe("/reproductor-galeria");
  });

  it("salir de la sala va a conciertos", () => {
    const r = resolveOpCommand("salir a conciertos", "/sala/espectador/al-universo-nova-byte");
    expect(r.navigateTo).toBe("/nuestras-salas");
  });
});
