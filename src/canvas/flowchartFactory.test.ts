import { describe, expect, it } from "vitest";
import { buildMermaid } from "./flowchartFactory";

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
