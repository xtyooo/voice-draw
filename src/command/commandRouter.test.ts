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

  it("uses local rules for multi-step drawing commands before AI", async () => {
    const ai = vi.fn();
    const parsed = await parseCommandText({
      text: "画一个红色圆形，然后画一个蓝色矩形，再画一条从圆形到矩形的箭头",
      sceneSummary: "",
      parseWithAi: ai,
    });
    expect(parsed.source).toBe("rule");
    expect(parsed.commands).toHaveLength(3);
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

  it("uses AI for open-ended process descriptions even when local rules could build a rough flow", async () => {
    const ai = vi.fn().mockResolvedValue({
      source: "ai",
      text: "帮我整理一个外卖下单流程，从选择商品开始，接着提交订单，然后支付，失败后回到支付页",
      commands: [{ intent: "create_flowchart", mermaid: "flowchart TD\nA[选择商品] --> B[提交订单]" }],
      explanation: "ok",
    });

    const parsed = await parseCommandText({
      text: "帮我整理一个外卖下单流程，从选择商品开始，接着提交订单，然后支付，失败后回到支付页",
      sceneSummary: "",
      parseWithAi: ai,
    });

    expect(parsed.source).toBe("ai");
    expect(ai).toHaveBeenCalledOnce();
  });

  it("uses AI for diagram requests that do not literally say flowchart", async () => {
    const ai = vi.fn().mockResolvedValue({
      source: "ai",
      text: "画一张系统登录图，包含输入账号密码、校验信息、成功进入首页、失败重新输入",
      commands: [{ intent: "create_flowchart", mermaid: "flowchart TD\nA[输入账号密码] --> B{校验信息}" }],
      explanation: "ok",
    });

    const parsed = await parseCommandText({
      text: "画一张系统登录图，包含输入账号密码、校验信息、成功进入首页、失败重新输入",
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
