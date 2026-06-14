import { findColor, getColorInfo } from "../utils/colorMap";
import type { VoiceColor } from "../utils/colorMap";
import { findShape } from "../utils/shapeMap";
import type { VoiceShape } from "../utils/shapeMap";
import { extractAfterKeyword, extractQuotedText, normalizeText } from "../utils/textNormalize";
import type {
  CreateShapeCommand,
  Direction,
  DrawCommand,
  ParsedCommand,
  PositionKeyword,
  TargetRef,
} from "./types";

const POSITION_WORDS: Array<[PositionKeyword, string[]]> = [
  ["center", ["中间", "中央", "中心"]],
  ["left", ["左边", "左侧", "靠左"]],
  ["right", ["右边", "右侧", "靠右"]],
  ["top", ["上边", "上方", "顶部"]],
  ["bottom", ["下边", "下方", "底部"]],
];

const DIRECTION_WORDS: Array<[Direction, string[]]> = [
  ["left", ["向左", "往左", "左移"]],
  ["right", ["向右", "往右", "右移"]],
  ["up", ["向上", "往上", "上移"]],
  ["down", ["向下", "往下", "下移"]],
];

const ORDINAL_WORDS: Array<[number, string[]]> = [
  [1, ["第一个", "第一個", "1个", "一号"]],
  [2, ["第二个", "第二個", "2个", "二号"]],
  [3, ["第三个", "第三個", "3个", "三号"]],
];

export function requiresAiParsing(input: string): boolean {
  const text = normalizeText(input);
  return (
    text.includes("流程图") ||
    text.includes("时序图") ||
    text.includes("架构图") ||
    (text.includes("从") && (text.includes("然后") || text.includes("接着"))) ||
    text.includes("成功后") ||
    text.includes("失败后")
  );
}

export function parseRuleCommand(input: string): ParsedCommand | null {
  const text = normalizeText(input);
  if (!text) {
    return null;
  }

  const sequence = parseSequence(input, text);
  if (sequence) {
    return sequence;
  }

  const flowchart = parseFlowchart(text);
  if (flowchart) {
    return parsed(input, [flowchart], "已识别为本地流程图命令");
  }

  const utility = parseUtility(text);
  if (utility) {
    return parsed(input, [utility], "已识别为画布控制命令");
  }

  const connect = parseConnect(text);
  if (connect) {
    return parsed(input, [connect], "已识别为连接命令");
  }

  const create = parseCreate(text);
  if (create) {
    return parsed(input, [create], "已识别为创建图形命令");
  }

  const select = parseSelect(text);
  if (select) {
    return parsed(input, [select], "已识别为选中对象命令");
  }

  const update = parseUpdate(text);
  if (update) {
    return parsed(input, [update], "已识别为编辑对象命令");
  }

  const move = parseMove(text);
  if (move) {
    return parsed(input, [move], "已识别为移动对象命令");
  }

  const del = parseDelete(text);
  if (del) {
    return parsed(input, [del], "已识别为删除对象命令");
  }

  return null;
}

function parseSequence(original: string, text: string): ParsedCommand | null {
  if (!/然后|接着|之后|再|并且/.test(text)) {
    return null;
  }

  const parts = text
    .split(/然后|接着|之后|再|并且/)
    .map((part) => part.replace(/^[,，。.\s]+|[,，。.\s]+$/g, ""))
    .filter(Boolean);

  if (parts.length < 2) {
    return null;
  }

  const commands: DrawCommand[] = [];
  for (const part of parts) {
    const local = parseSingleCommand(part);
    if (!local) {
      return null;
    }
    commands.push(...local.commands);
  }

  return parsed(original, commands, `已拆解为 ${commands.length} 个本地绘图步骤`);
}

function parseSingleCommand(text: string): ParsedCommand | null {
  const flowchart = parseFlowchart(text);
  if (flowchart) {
    return parsed(text, [flowchart], "已识别为本地流程图命令");
  }

  const utility = parseUtility(text);
  if (utility) {
    return parsed(text, [utility], "已识别为画布控制命令");
  }

  const connect = parseConnect(text);
  if (connect) {
    return parsed(text, [connect], "已识别为连接命令");
  }

  const create = parseCreate(text);
  if (create) {
    return parsed(text, [create], "已识别为创建图形命令");
  }

  const select = parseSelect(text);
  if (select) {
    return parsed(text, [select], "已识别为选中对象命令");
  }

  const update = parseUpdate(text);
  if (update) {
    return parsed(text, [update], "已识别为编辑对象命令");
  }

  const move = parseMove(text);
  if (move) {
    return parsed(text, [move], "已识别为移动对象命令");
  }

  const del = parseDelete(text);
  if (del) {
    return parsed(text, [del], "已识别为删除对象命令");
  }

  return null;
}

function parsed(text: string, commands: DrawCommand[], explanation: string): ParsedCommand {
  return {
    source: "rule",
    text,
    commands,
    explanation,
  };
}

function parseUtility(text: string): DrawCommand | null {
  if (/撤销|回退|上一步/.test(text)) {
    return { intent: "undo" };
  }
  if (/重做|恢复下一步/.test(text)) {
    return { intent: "redo" };
  }
  if (/清空|清除画布|全部删除/.test(text)) {
    return { intent: "clear_canvas" };
  }
  if (/导出|下载|保存图片/.test(text)) {
    return { intent: "export_image" };
  }
  return null;
}

function parseCreate(text: string): CreateShapeCommand | null {
  const textContent = extractDrawableText(text);
  const writesText = /写|添加文字|文本|文字/.test(text);
  if (writesText && textContent) {
    return {
      intent: "create_shape",
      shape: "text",
      text: textContent,
      style: { strokeColor: "#1e1e1e" },
      layout: { position: findPosition(text), width: Math.max(180, textContent.length * 28), height: 46 },
    };
  }

  if (!/画|创建|添加/.test(text)) {
    return null;
  }

  const shape = findShape(text);
  if (!shape || shape.key === "arrow") {
    return null;
  }

  const color = findColor(text);
  const size = inferSize(text, shape.key);
  return {
    intent: "create_shape",
    shape: shape.key,
    text: textContent,
    style: color
      ? {
          color: color.key,
          strokeColor: color.strokeColor,
          backgroundColor: color.backgroundColor,
        }
      : undefined,
    layout: {
      position: findPosition(text),
      width: size.width,
      height: size.height,
    },
  };
}

function parseSelect(text: string): DrawCommand | null {
  if (!/选中|选择|定位/.test(text)) {
    return null;
  }
  return {
    intent: "select_shape",
    target: parseTarget(text),
  };
}

function parseUpdate(text: string): DrawCommand | null {
  if (!/改成|变成|变为|放大|缩小|变大|变小|更大|更小/.test(text)) {
    return null;
  }

  const color = findColor(text);
  const scale = parseScale(text);
  if (!color && !scale) {
    return null;
  }

  return {
    intent: "update_shape",
    target: parseTarget(text),
    changes: {
      color: color?.key,
      strokeColor: color?.strokeColor,
      backgroundColor: color?.backgroundColor,
      scale,
    },
  };
}

function parseMove(text: string): DrawCommand | null {
  if (!/移动|移到|放到|挪|往|向/.test(text)) {
    return null;
  }
  const direction = findDirection(text);
  const position = findPosition(text);
  if (!direction && !position) {
    return null;
  }
  return {
    intent: "move_shape",
    target: parseTarget(text),
    direction,
    position,
    distance: parseDistance(text),
  };
}

function parseDelete(text: string): DrawCommand | null {
  if (!/删除|删掉|去掉|移除/.test(text)) {
    return null;
  }
  return {
    intent: "delete_shape",
    target: parseTarget(text),
  };
}

function parseConnect(text: string): DrawCommand | null {
  if (!/箭头|连接|连线/.test(text) || !/从/.test(text) || !/到/.test(text)) {
    return null;
  }
  const match = text.match(/从(.+?)到(.+?)(?:的?箭头|的?连线|$)/);
  if (!match) {
    return null;
  }
  return {
    intent: "connect",
    from: parseTarget(match[1]),
    to: parseTarget(match[2]),
    lineType: "arrow",
  };
}

export function parseTarget(text: string): TargetRef {
  const quoted = extractQuotedText(text);
  if (quoted) {
    return { kind: "by_text", text: quoted };
  }

  const textAfterKeyword = extractAfterKeyword(text, ["文字是", "文本是", "叫做", "名为"]);
  if (textAfterKeyword) {
    return { kind: "by_text", text: textAfterKeyword };
  }

  const ordinal = ORDINAL_WORDS.find(([, words]) => words.some((word) => text.includes(word)));
  const shape = findShape(text)?.key;
  if (ordinal) {
    return { kind: "ordinal", index: ordinal[0], shape };
  }

  if (/刚才|刚刚|刚画|刚创建|上一个|最近|最后/.test(text)) {
    return { kind: "last", shape };
  }

  if (/它|这|这个|那个|当前|选中|该/.test(text)) {
    return { kind: "selected" };
  }

  const position = findPosition(text);
  const color = findColor(text)?.key;
  if (position) {
    return { kind: "position", position, shape, color };
  }

  return { kind: "by_type_color", shape, color };
}

function inferSize(text: string, shape: VoiceShape): { width: number; height: number } {
  const large = /大|较大/.test(text);
  const small = /小|较小/.test(text);
  if (shape === "ellipse") {
    return large ? { width: 180, height: 130 } : small ? { width: 90, height: 70 } : { width: 140, height: 100 };
  }
  if (shape === "diamond") {
    return large ? { width: 180, height: 120 } : small ? { width: 100, height: 70 } : { width: 150, height: 100 };
  }
  return large ? { width: 200, height: 110 } : small ? { width: 110, height: 60 } : { width: 170, height: 90 };
}

function findPosition(text: string): PositionKeyword | undefined {
  return POSITION_WORDS.find(([, words]) => words.some((word) => text.includes(word)))?.[0];
}

function findDirection(text: string): Direction | undefined {
  return DIRECTION_WORDS.find(([, words]) => words.some((word) => text.includes(word)))?.[0];
}

function parseScale(text: string): number | undefined {
  const percent = text.match(/(\d+)%/);
  if (percent) {
    const value = Number(percent[1]);
    if (Number.isFinite(value) && value > 0) {
      return /缩小|变小|更小/.test(text) ? Math.max(0.1, 1 - value / 100) : 1 + value / 100;
    }
  }
  if (/缩小|变小|更小/.test(text)) {
    return 0.8;
  }
  if (/放大|变大|更大/.test(text)) {
    return 1.2;
  }
  return undefined;
}

function parseDistance(text: string): number {
  const number = text.match(/(\d+)/);
  if (number) {
    return Number(number[1]);
  }
  if (/一点|一些/.test(text)) {
    return 80;
  }
  return 120;
}

export function colorTarget(color: VoiceColor): TargetRef {
  const colorInfo = getColorInfo(color);
  return { kind: "by_type_color", color: colorInfo.key };
}

function extractDrawableText(text: string): string | undefined {
  const quoted = extractQuotedText(text);
  if (quoted) {
    return quoted;
  }
  const value = extractAfterKeyword(text, ["写", "添加文字", "文字是", "文本是", "叫做", "名为"]);
  if (!value) {
    return undefined;
  }
  return value.replace(/^(上|下|左|右|中间|中央|中心)/, "").trim() || undefined;
}

function parseFlowchart(text: string): DrawCommand | null {
  if (!/流程图|流程/.test(text)) {
    return null;
  }

  if (/登录|登陆/.test(text)) {
    return {
      intent: "create_flowchart",
      mermaid: [
        "flowchart TD",
        "A[输入账号密码] --> B{校验信息}",
        "B -- 成功 --> C[进入首页]",
        "B -- 失败 --> D[提示重新输入]",
      ].join("\n"),
    };
  }

  if (/注册/.test(text)) {
    return {
      intent: "create_flowchart",
      mermaid: [
        "flowchart TD",
        "A[填写注册信息] --> B{校验信息}",
        "B -- 通过 --> C[发送验证码]",
        "C --> D[创建账号]",
        "B -- 不通过 --> E[提示修改信息]",
      ].join("\n"),
    };
  }

  if (/订单|支付|付款/.test(text)) {
    return {
      intent: "create_flowchart",
      mermaid: [
        "flowchart TD",
        "A[提交订单] --> B[选择支付方式]",
        "B --> C{支付结果}",
        "C -- 成功 --> D[生成订单]",
        "C -- 失败 --> E[提示重新支付]",
      ].join("\n"),
    };
  }

  const steps = text
    .replace(/^.*流程图,?/, "")
    .replace(/^从/, "")
    .split(/开始|然后|接着|之后|再|最后|,/)
    .map((item) => item.replace(/^(从|把|将)/, "").replace(/(结束|完成)$/, "").trim())
    .filter(Boolean)
    .slice(0, 6);

  if (steps.length < 2) {
    return null;
  }

  const ids = ["A", "B", "C", "D", "E", "F"];
  const lines = ["flowchart TD", ...steps.map((step, index) => `${ids[index]}[${step}]`)];
  for (let index = 0; index < steps.length - 1; index += 1) {
    lines.push(`${ids[index]} --> ${ids[index + 1]}`);
  }
  return { intent: "create_flowchart", mermaid: lines.join("\n") };
}
