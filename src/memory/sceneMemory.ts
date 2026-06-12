import type { TargetRef, ShapeRef } from "../command/types";
import { colorLabel, getColorByBackground } from "../utils/colorMap";
import type { VoiceColor } from "../utils/colorMap";
import { shapeLabel } from "../utils/shapeMap";
import type { VoiceShape } from "../utils/shapeMap";

type ElementLike = {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  backgroundColor?: string;
  strokeColor?: string;
  customData?: Record<string, unknown>;
  isDeleted?: boolean;
};

export type ResolveResult =
  | { kind: "found"; ref: ShapeRef }
  | { kind: "multiple"; refs: ShapeRef[] }
  | { kind: "missing"; reason: string };

export class SceneMemory {
  private refs = new Map<string, ShapeRef>();
  private lastId: string | null = null;
  private selectedId: string | null = null;

  syncFromElements(elements: readonly ElementLike[]) {
    for (const element of elements) {
      if (element.isDeleted) {
        this.refs.delete(element.id);
        continue;
      }
      const shape = toVoiceShape(element.type);
      if (!shape) {
        continue;
      }
      const color = inferColor(element);
      const existing = this.refs.get(element.id);
      const ref: ShapeRef = {
        id: element.id,
        shape,
        text: element.text || existing?.text,
        color,
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        createdAt: existing?.createdAt ?? Date.now(),
        aliases: buildAliases(shape, element.text || existing?.text, color),
      };
      this.refs.set(element.id, ref);
    }

    for (const id of [...this.refs.keys()]) {
      if (!elements.some((element) => element.id === id && !element.isDeleted)) {
        this.refs.delete(id);
      }
    }
  }

  trackCreated(ref: ShapeRef) {
    this.refs.set(ref.id, ref);
    this.lastId = ref.id;
    this.selectedId = ref.id;
  }

  trackCreatedMany(refs: ShapeRef[]) {
    refs.forEach((ref) => this.refs.set(ref.id, ref));
    const last = refs.at(-1);
    if (last) {
      this.lastId = last.id;
      this.selectedId = last.id;
    }
  }

  markDeleted(ids: string[]) {
    ids.forEach((id) => this.refs.delete(id));
    if (this.lastId && ids.includes(this.lastId)) {
      this.lastId = null;
    }
    if (this.selectedId && ids.includes(this.selectedId)) {
      this.selectedId = null;
    }
  }

  select(id: string) {
    if (this.refs.has(id)) {
      this.selectedId = id;
    }
  }

  clear() {
    this.refs.clear();
    this.lastId = null;
    this.selectedId = null;
  }

  all(): ShapeRef[] {
    return [...this.refs.values()].sort((a, b) => a.createdAt - b.createdAt);
  }

  summary(): string {
    return this.all()
      .map((ref, index) => `${index + 1}. ${colorLabel(ref.color)}${shapeLabel(ref.shape)}${ref.text ? `(${ref.text})` : ""}`)
      .join("\n");
  }

  resolve(target: TargetRef): ResolveResult {
    if (target.kind === "last") {
      const candidates = this.filter({ shape: target.shape });
      const last = [...candidates].sort((a, b) => b.createdAt - a.createdAt)[0];
      return last ? { kind: "found", ref: last } : { kind: "missing", reason: "没有找到最近创建的对象" };
    }

    if (target.kind === "selected") {
      const selected = this.selectedId ? this.refs.get(this.selectedId) : undefined;
      return selected ? { kind: "found", ref: selected } : { kind: "missing", reason: "当前没有选中的对象" };
    }

    if (target.kind === "by_id") {
      const ref = this.refs.get(target.id);
      return ref ? { kind: "found", ref } : { kind: "missing", reason: "没有找到指定 ID 的对象" };
    }

    if (target.kind === "by_text") {
      return this.toResolveResult(this.filter({ text: target.text }), "没有找到文字匹配的对象");
    }

    if (target.kind === "ordinal") {
      const list = this.filter({ shape: target.shape });
      const ref = list[target.index - 1];
      return ref ? { kind: "found", ref } : { kind: "missing", reason: "没有找到指定序号的对象" };
    }

    if (target.kind === "position") {
      const list = this.filter({ shape: target.shape, color: target.color });
      const sorted = sortByPosition(list, target.position);
      return sorted[0] ? { kind: "found", ref: sorted[0] } : { kind: "missing", reason: "没有找到指定位置的对象" };
    }

    return this.toResolveResult(
      this.filter({ shape: target.shape, color: target.color, position: target.position }),
      "没有找到对应对象",
    );
  }

  private filter(criteria: { shape?: VoiceShape; color?: VoiceColor; text?: string; position?: string }): ShapeRef[] {
    let refs = this.all();
    if (criteria.shape) {
      refs = refs.filter((ref) => ref.shape === criteria.shape);
    }
    if (criteria.color) {
      refs = refs.filter((ref) => ref.color === criteria.color);
    }
    const text = criteria.text;
    if (text) {
      refs = refs.filter((ref) => ref.text?.includes(text) || ref.aliases.some((alias) => alias.includes(text)));
    }
    if (criteria.position) {
      refs = sortByPosition(refs, criteria.position).slice(0, 1);
    }
    return refs;
  }

  private toResolveResult(refs: ShapeRef[], missingReason: string): ResolveResult {
    if (refs.length === 0) {
      return { kind: "missing", reason: missingReason };
    }
    if (refs.length > 1) {
      return { kind: "multiple", refs };
    }
    return { kind: "found", ref: refs[0] };
  }
}

export function createShapeRef(input: {
  id: string;
  shape: VoiceShape;
  text?: string;
  color?: VoiceColor;
  x: number;
  y: number;
  width: number;
  height: number;
}): ShapeRef {
  return {
    ...input,
    createdAt: Date.now(),
    aliases: buildAliases(input.shape, input.text, input.color),
  };
}

function buildAliases(shape: VoiceShape, text?: string, color?: VoiceColor): string[] {
  return [shapeLabel(shape), colorLabel(color), text, color ? `${colorLabel(color)}${shapeLabel(shape)}` : undefined].filter(Boolean) as string[];
}

function inferColor(element: ElementLike): VoiceColor | undefined {
  const customColor = element.customData?.voiceColor;
  if (typeof customColor === "string") {
    return customColor as VoiceColor;
  }
  return getColorByBackground(element.backgroundColor)?.key ?? getColorByBackground(element.strokeColor)?.key;
}

function toVoiceShape(type: string): VoiceShape | undefined {
  if (type === "rectangle") return "rectangle";
  if (type === "ellipse") return "ellipse";
  if (type === "diamond") return "diamond";
  if (type === "arrow") return "arrow";
  if (type === "text") return "text";
  return undefined;
}

function sortByPosition(refs: ShapeRef[], position: string): ShapeRef[] {
  const copy = [...refs];
  if (position === "left") return copy.sort((a, b) => a.x - b.x);
  if (position === "right") return copy.sort((a, b) => b.x - a.x);
  if (position === "top") return copy.sort((a, b) => a.y - b.y);
  if (position === "bottom") return copy.sort((a, b) => b.y - a.y);
  return copy.sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y));
}
