import { describe, expect, it } from "vitest";
import { createShapeRef, SceneMemory } from "../memory/sceneMemory";
import { validateCommand } from "./validator";

describe("validateCommand", () => {
  it("marks ambiguous connect endpoints with their role", () => {
    const memory = new SceneMemory();
    memory.trackCreatedMany([
      createShapeRef({ id: "a", shape: "ellipse", color: "red", x: 0, y: 0, width: 80, height: 80 }),
      createShapeRef({ id: "b", shape: "rectangle", color: "blue", x: 100, y: 0, width: 80, height: 80 }),
      createShapeRef({ id: "c", shape: "rectangle", color: "blue", x: 220, y: 0, width: 80, height: 80 }),
    ]);

    const result = validateCommand(
      {
        intent: "connect",
        from: { kind: "by_id", id: "a" },
        to: { kind: "by_type_color", shape: "rectangle", color: "blue" },
        lineType: "arrow",
      },
      memory,
    );

    expect(result).toMatchObject({
      kind: "need_confirm",
      role: "to",
    });
  });
});
