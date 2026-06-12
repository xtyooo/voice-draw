import { describe, expect, it, vi } from "vitest";
import { parseCommandText } from "./commandRouter";

describe("parseCommandText", () => {
  it("uses local rules for simple commands", async () => {
    const ai = vi.fn();
    const parsed = await parseCommandText({
      text: "画一个红色圆形",
      sceneSummary: "",
      parseWithAi: ai,
    });
    expect(parsed.source).toBe("rule");
    expect(ai).not.toHaveBeenCalled();
  });

  it("uses AI for complex commands", async () => {
    const ai = vi.fn().mockResolvedValue({
      source: "ai",
      text: "画流程图",
      commands: [{ intent: "create_flowchart", mermaid: "flowchart TD\nA[开始] --> B[结束]" }],
      explanation: "ok",
    });
    const parsed = await parseCommandText({
      text: "画一个流程图，从开始然后结束",
      sceneSummary: "",
      parseWithAi: ai,
    });
    expect(parsed.source).toBe("ai");
    expect(ai).toHaveBeenCalledOnce();
  });

  it("falls back to local rules when AI fails and local parse exists", async () => {
    const parsed = await parseCommandText({
      text: "清空画布",
      sceneSummary: "",
      parseWithAi: vi.fn().mockRejectedValue(new Error("down")),
    });
    expect(parsed.commands[0]).toMatchObject({ intent: "clear_canvas" });
  });
});
