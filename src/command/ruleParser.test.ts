import { describe, expect, it } from "vitest";
import { parseRuleCommand, requiresAiParsing } from "./ruleParser";

describe("parseRuleCommand", () => {
  it("parses colored shape creation", () => {
    const parsed = parseRuleCommand("画一个红色圆形");
    expect(parsed?.commands[0]).toMatchObject({
      intent: "create_shape",
      shape: "ellipse",
      style: { color: "red" },
    });
  });

  it("parses text creation", () => {
    const parsed = parseRuleCommand("在中间写“用户登录”");
    expect(parsed?.commands[0]).toMatchObject({
      intent: "create_shape",
      shape: "text",
      text: "用户登录",
    });
  });

  it("parses unquoted text creation", () => {
    const parsed = parseRuleCommand("在中间写用户登录");
    expect(parsed?.commands[0]).toMatchObject({
      intent: "create_shape",
      shape: "text",
      text: "用户登录",
    });
  });

  it("parses update, move, delete, undo, and clear commands", () => {
    expect(parseRuleCommand("把刚才的矩形放大一点")?.commands[0]).toMatchObject({
      intent: "update_shape",
      changes: { scale: 1.2 },
    });
    expect(parseRuleCommand("把它往右移动一点")?.commands[0]).toMatchObject({
      intent: "move_shape",
      target: { kind: "selected" },
      direction: "right",
    });
    expect(parseRuleCommand("删除刚才的箭头")?.commands[0]).toMatchObject({
      intent: "delete_shape",
    });
    expect(parseRuleCommand("撤销上一步")?.commands[0]).toMatchObject({ intent: "undo" });
    expect(parseRuleCommand("清空画布")?.commands[0]).toMatchObject({ intent: "clear_canvas" });
  });

  it("parses arrow connection targets", () => {
    const parsed = parseRuleCommand("画一条从圆形到矩形的箭头");
    expect(parsed?.commands[0]).toMatchObject({
      intent: "connect",
      lineType: "arrow",
    });
  });

  it("splits sequential local drawing commands", () => {
    const parsed = parseRuleCommand("画一个红色圆形，然后画一个蓝色矩形，再画一条从圆形到矩形的箭头");
    expect(parsed?.commands).toHaveLength(3);
    expect(parsed?.commands[0]).toMatchObject({ intent: "create_shape", shape: "ellipse" });
    expect(parsed?.commands[1]).toMatchObject({ intent: "create_shape", shape: "rectangle" });
    expect(parsed?.commands[2]).toMatchObject({ intent: "connect", lineType: "arrow" });
  });

  it("splits create and edit commands that depend on selected objects", () => {
    const parsed = parseRuleCommand("画一个蓝色矩形，然后把它放大一点，再把它改成绿色");
    expect(parsed?.commands).toHaveLength(3);
    expect(parsed?.commands[1]).toMatchObject({
      intent: "update_shape",
      target: { kind: "selected" },
      changes: { scale: 1.2 },
    });
    expect(parsed?.commands[2]).toMatchObject({
      intent: "update_shape",
      changes: { color: "green" },
    });
  });

  it("detects complex flowchart input for AI", () => {
    expect(requiresAiParsing("画一个登录流程图，从输入账号密码开始，然后校验信息")).toBe(true);
  });

  it("creates local fallback flowcharts for common demos", () => {
    const parsed = parseRuleCommand("画一个登录流程图，从输入账号密码开始，接着校验信息，成功后进入首页，失败后提示重新输入");
    expect(parsed?.commands[0]).toMatchObject({
      intent: "create_flowchart",
      mermaid: expect.stringContaining("输入账号密码"),
    });
  });
});
