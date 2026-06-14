import { findColor } from "../utils/colorMap";
import { findShape } from "../utils/shapeMap";
import { normalizeText } from "../utils/textNormalize";
import type { ShapeRef } from "./types";

export type VoiceConfirmationResult =
  | { kind: "choose"; candidate: ShapeRef }
  | { kind: "cancel" }
  | { kind: "none" };

export function resolveVoiceConfirmation(input: string, candidates: ShapeRef[]): VoiceConfirmationResult {
  const text = normalizeText(input);
  if (!text || candidates.length === 0) {
    return { kind: "none" };
  }

  if (/取消|算了|不要|停止/.test(text)) {
    return { kind: "cancel" };
  }

  if (isNewDrawingCommand(text)) {
    return { kind: "none" };
  }

  const ordinal = parseOrdinal(text);
  if (ordinal !== undefined) {
    const candidate = candidates[ordinal];
    return candidate ? { kind: "choose", candidate } : { kind: "none" };
  }

  const positioned = matchPosition(text, candidates);
  if (positioned) {
    return { kind: "choose", candidate: positioned };
  }

  const color = findColor(text)?.key;
  const shape = findShape(text)?.key;
  const matched = candidates.find((candidate) => {
    const matchesColor = !color || candidate.color === color;
    const matchesShape = !shape || candidate.shape === shape;
    const matchesText =
      Boolean(candidate.text && text.includes(candidate.text)) ||
      candidate.aliases.some((alias) => alias && text.includes(alias));
    return matchesColor && matchesShape && (Boolean(color || shape) || matchesText);
  });

  return matched ? { kind: "choose", candidate: matched } : { kind: "none" };
}

function isNewDrawingCommand(text: string): boolean {
  return /^(画|创建|添加|写|删除|删掉|移动|移到|放到|把|撤销|重做|清空|导出)/.test(text);
}

function parseOrdinal(text: string): number | undefined {
  const words: Array<[number, RegExp]> = [
    [0, /第?一(个|個)?|1号|一号/],
    [1, /第?二(个|個)?|2号|二号/],
    [2, /第?三(个|個)?|3号|三号/],
    [3, /第?四(个|個)?|4号|四号/],
    [4, /第?五(个|個)?|5号|五号/],
  ];
  return words.find(([, pattern]) => pattern.test(text))?.[0];
}

function matchPosition(text: string, candidates: ShapeRef[]): ShapeRef | undefined {
  if (/左边|左侧|最左|靠左/.test(text)) {
    return [...candidates].sort((a, b) => a.x - b.x)[0];
  }
  if (/右边|右侧|最右|靠右/.test(text)) {
    return [...candidates].sort((a, b) => b.x - a.x)[0];
  }
  if (/上边|上方|顶部|最上/.test(text)) {
    return [...candidates].sort((a, b) => a.y - b.y)[0];
  }
  if (/下边|下方|底部|最下/.test(text)) {
    return [...candidates].sort((a, b) => b.y - a.y)[0];
  }
  return undefined;
}
