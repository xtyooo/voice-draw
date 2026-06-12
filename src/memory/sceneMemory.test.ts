import { describe, expect, it } from "vitest";
import { SceneMemory, createShapeRef } from "./sceneMemory";

describe("SceneMemory", () => {
  it("resolves last and selected refs", () => {
    const memory = new SceneMemory();
    memory.trackCreated(
      createShapeRef({
        id: "a",
        shape: "rectangle",
        color: "blue",
        x: 10,
        y: 20,
        width: 100,
        height: 80,
      }),
    );

    expect(memory.resolve({ kind: "last" })).toMatchObject({ kind: "found", ref: { id: "a" } });
    expect(memory.resolve({ kind: "selected" })).toMatchObject({ kind: "found", ref: { id: "a" } });
  });

  it("resolves text and ordinal refs", () => {
    const memory = new SceneMemory();
    memory.trackCreatedMany([
      createShapeRef({ id: "a", shape: "rectangle", text: "登录", x: 0, y: 0, width: 100, height: 80 }),
      createShapeRef({ id: "b", shape: "rectangle", text: "校验", x: 120, y: 0, width: 100, height: 80 }),
    ]);

    expect(memory.resolve({ kind: "by_text", text: "校验" })).toMatchObject({ kind: "found", ref: { id: "b" } });
    expect(memory.resolve({ kind: "by_id", id: "a" })).toMatchObject({ kind: "found", ref: { id: "a" } });
    expect(memory.resolve({ kind: "ordinal", index: 1, shape: "rectangle" })).toMatchObject({
      kind: "found",
      ref: { id: "a" },
    });
  });

  it("returns multiple for ambiguous type-color refs and position can disambiguate", () => {
    const memory = new SceneMemory();
    memory.trackCreatedMany([
      createShapeRef({ id: "left", shape: "ellipse", color: "red", x: 0, y: 0, width: 80, height: 80 }),
      createShapeRef({ id: "right", shape: "ellipse", color: "red", x: 300, y: 0, width: 80, height: 80 }),
    ]);

    expect(memory.resolve({ kind: "by_type_color", shape: "ellipse", color: "red" })).toMatchObject({
      kind: "multiple",
    });
    expect(memory.resolve({ kind: "position", position: "left", shape: "ellipse", color: "red" })).toMatchObject({
      kind: "found",
      ref: { id: "left" },
    });
  });
});
