import { describe, expect, it } from "vitest";
import { parseOnniWakePhrase } from "@/lib/onniVoice";

describe("parseOnniWakePhrase", () => {
  it("detecta Onni y Oni", () => {
    expect(parseOnniWakePhrase("Onni llevame al lobby")).toEqual({
      heard: true,
      command: "llevame al lobby",
    });
    expect(parseOnniWakePhrase("oye oni abre el menu")).toEqual({
      heard: true,
      command: "abre el menu",
    });
  });

  it("ignora frases sin palabra de activacion", () => {
    expect(parseOnniWakePhrase("llevame al lobby").heard).toBe(false);
  });

  it("Onni sin comando", () => {
    expect(parseOnniWakePhrase("onni").command).toBe("");
    expect(parseOnniWakePhrase("onni").heard).toBe(true);
  });
});
