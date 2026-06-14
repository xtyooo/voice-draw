import { describe, expect, it } from "vitest";
import { getAutoExecutableTranscript } from "./autoExecute";

describe("getAutoExecutableTranscript", () => {
  it("returns trimmed speech when it can be executed", () => {
    expect(getAutoExecutableTranscript({ transcript: "  画一个红色圆形  ", busy: false })).toBe("画一个红色圆形");
  });

  it("ignores empty speech", () => {
    expect(getAutoExecutableTranscript({ transcript: "   ", busy: false })).toBeNull();
  });

  it("ignores speech while the command pipeline is busy", () => {
    expect(getAutoExecutableTranscript({ transcript: "清空画布", busy: true })).toBeNull();
  });

  it("ignores the same settled transcript before recognition resets", () => {
    expect(
      getAutoExecutableTranscript({
        transcript: "导出图片",
        busy: false,
        lastExecutedText: "导出图片",
      }),
    ).toBeNull();
  });
});
