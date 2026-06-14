import { describe, expect, it } from "vitest";
import type { ShapeRef } from "./types";
import { resolveVoiceConfirmation } from "./voiceConfirmation";

const candidates: ShapeRef[] = [
  {
    id: "left-red",
    shape: "ellipse",
    color: "red",
    text: "开始",
    x: 20,
    y: 80,
    width: 80,
    height: 80,
    createdAt: 1,
    aliases: ["红色圆形", "开始"],
  },
  {
    id: "right-blue",
    shape: "rectangle",
    color: "blue",
    text: "登录",
    x: 320,
    y: 80,
    width: 120,
    height: 80,
    createdAt: 2,
    aliases: ["蓝色矩形", "登录"],
  },
];

describe("resolveVoiceConfirmation", () => {
  it("chooses confirmation candidates by ordinal speech", () => {
    expect(resolveVoiceConfirmation("选择第二个", candidates)).toMatchObject({
      kind: "choose",
      candidate: { id: "right-blue" },
    });
  });

  it("chooses confirmation candidates by position speech", () => {
    expect(resolveVoiceConfirmation("就选左边那个", candidates)).toMatchObject({
      kind: "choose",
      candidate: { id: "left-red" },
    });
  });

  it("chooses confirmation candidates by spoken text", () => {
    expect(resolveVoiceConfirmation("选择登录这个", candidates)).toMatchObject({
      kind: "choose",
      candidate: { id: "right-blue" },
    });
  });

  it("cancels an active confirmation by voice", () => {
    expect(resolveVoiceConfirmation("取消这次操作", candidates)).toEqual({ kind: "cancel" });
  });

  it("returns none when speech is not a confirmation answer", () => {
    expect(resolveVoiceConfirmation("画一个红色圆形", candidates)).toEqual({ kind: "none" });
  });
});
