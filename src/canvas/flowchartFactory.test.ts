import { describe, expect, it } from "vitest";
import { buildMermaid } from "./flowchartFactory";
import { createShapeSkeleton } from "./elementFactory";

describe("buildMermaid", () => {
  it("builds a flowchart from structured nodes and edges", () => {
    const mermaid = buildMermaid(
      [
        { id: "A", text: "输入账号密码", type: "step" },
        { id: "B", text: "校验信息", type: "condition" },
      ],
      [{ from: "A", to: "B", label: "提交" }],
    );
    expect(mermaid).toContain("flowchart TD");
    expect(mermaid).toContain("A[输入账号密码]");
    expect(mermaid).toContain("B{校验信息}");
    expect(mermaid).toContain("A -- 提交 --> B");
  });
});

describe("createShapeSkeleton", () => {
  it("auto-places repeated shapes so they do not fully overlap", () => {
    const first = createShapeSkeleton({
      intent: "create_shape",
      shape: "ellipse",
      layout: { width: 140, height: 100 },
    });
    const second = createShapeSkeleton(
      {
        intent: "create_shape",
        shape: "rectangle",
        layout: { width: 170, height: 90 },
      },
      { width: 1200, height: 800, elementCount: 1 },
    );

    expect(second.x).not.toBe(first.x);
    expect(second.y).toBeDefined();
    expect(first.y).toBeDefined();
    expect(Math.abs(Number(second.y) - Number(first.y))).toBeLessThan(20);
  });
});
