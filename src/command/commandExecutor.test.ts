import { describe, expect, it } from "vitest";
import { createShapeRef, SceneMemory } from "../memory/sceneMemory";
import type { DrawCommand } from "./types";
import { executeValidatedCommands } from "./commandExecutor";

describe("executeValidatedCommands", () => {
  it("executes sequential commands after validating each step", async () => {
    const memory = new SceneMemory();
    const executed: DrawCommand[] = [];

    const feedback = await executeValidatedCommands({
      commands: [
        { intent: "create_shape", shape: "rectangle" },
        { intent: "update_shape", target: { kind: "selected" }, changes: { scale: 1.2 } },
      ],
      memory,
      executeOne: async (command) => {
        executed.push(command);
        if (command.intent === "create_shape") {
          memory.trackCreated(
            createShapeRef({
              id: "created",
              shape: command.shape,
              x: 0,
              y: 0,
              width: 100,
              height: 80,
            }),
          );
        }
        return { feedback: command.intent };
      },
    });

    expect(executed.map((command) => command.intent)).toEqual(["create_shape", "update_shape"]);
    expect(feedback).toEqual({ kind: "success", feedback: "update_shape" });
  });

  it("stops before executing an unsafe ambiguous command", async () => {
    const memory = new SceneMemory();
    memory.trackCreatedMany([
      createShapeRef({ id: "a", shape: "ellipse", color: "red", x: 0, y: 0, width: 80, height: 80 }),
      createShapeRef({ id: "b", shape: "ellipse", color: "red", x: 200, y: 0, width: 80, height: 80 }),
    ]);
    const executed: DrawCommand[] = [];

    const result = await executeValidatedCommands({
      commands: [{ intent: "delete_shape", target: { kind: "by_type_color", shape: "ellipse", color: "red" } }],
      memory,
      executeOne: async (command) => {
        executed.push(command);
        return { feedback: "deleted" };
      },
    });

    expect(executed).toHaveLength(0);
    expect(result).toMatchObject({ kind: "need_confirm", role: "target" });
  });
});
