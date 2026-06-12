import { describe, expect, it } from "vitest";
import { parseOnniWakePhrase } from "@/lib/onniVoice";

describe("parseOnniWakePhrase", () => {
  it("detecta Onni, Oni y variantes de voz", () => {
    expect(parseOnniWakePhrase("Onni llevame al lobby")).toEqual({
      heard: true,
      command: "llevame al lobby",
    });
    expect(parseOnniWakePhrase("oye oni abre el menu")).toEqual({
      heard: true,
      command: "abre el menu",
    });
    expect(parseOnniWakePhrase("hony lleva me a conciertos")).toEqual({
      heard: true,
      command: "lleva me a conciertos",
    });
    expect(parseOnniWakePhrase("ono abre el lobby")).toEqual({
      heard: true,
      command: "abre el lobby",
    });
    expect(parseOnniWakePhrase("honi que es onniverso")).toEqual({
      heard: true,
      command: "que es onniverso",
    });
  });

  it("corrige variantes tipicas de Whisper", () => {
    expect(parseOnniWakePhrase("hola only llevame al lobby")).toEqual({
      heard: true,
      command: "llevame al lobby",
    });
    expect(parseOnniWakePhrase("hola uni que hora es")).toEqual({
      heard: true,
      command: "que hora es",
    });
  });

  it("ignora frases sin palabra de activacion", () => {
    expect(parseOnniWakePhrase("llevame al lobby").heard).toBe(false);
  });

  it("Onni sin comando", () => {
    expect(parseOnniWakePhrase("onni").command).toBe("");
    expect(parseOnniWakePhrase("onni").heard).toBe(true);
  });

  it("detecta hola onni y hola oni con o sin comando", () => {
    expect(parseOnniWakePhrase("hola onni")).toEqual({ heard: true, command: "" });
    expect(parseOnniWakePhrase("Hola Oni")).toEqual({ heard: true, command: "" });
    expect(parseOnniWakePhrase("hola onni llevame a la clase")).toEqual({
      heard: true,
      command: "llevame a la clase",
    });
    expect(parseOnniWakePhrase("oye onni abre conciertos")).toEqual({
      heard: true,
      command: "abre conciertos",
    });
    expect(parseOnniWakePhrase("oni inicio")).toEqual({ heard: true, command: "inicio" });
    expect(parseOnniWakePhrase("oni llevame al inicio")).toEqual({
      heard: true,
      command: "llevame al inicio",
    });
    expect(parseOnniWakePhrase("oni iniciar clase")).toEqual({
      heard: true,
      command: "iniciar clase",
    });
    expect(parseOnniWakePhrase("oni inia la clase")).toEqual({
      heard: true,
      command: "inia la clase",
    });
    expect(parseOnniWakePhrase("oni llevame a la clase")).toEqual({
      heard: true,
      command: "llevame a la clase",
    });
    expect(parseOnniWakePhrase("oni entrar")).toEqual({ heard: true, command: "entrar" });
    expect(parseOnniWakePhrase("oni entra a la clase")).toEqual({
      heard: true,
      command: "entra a la clase",
    });
  });
});
