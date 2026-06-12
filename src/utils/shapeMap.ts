export type VoiceShape = "rectangle" | "ellipse" | "diamond" | "arrow" | "text";

export type ShapeInfo = {
  key: VoiceShape;
  label: string;
  aliases: string[];
};

export const SHAPES: ShapeInfo[] = [
  { key: "rectangle", label: "矩形", aliases: ["矩形", "方形", "框", "节点", "步骤"] },
  { key: "ellipse", label: "圆形", aliases: ["圆形", "圆", "椭圆", "开始", "结束"] },
  { key: "diamond", label: "菱形", aliases: ["菱形", "判断", "条件"] },
  { key: "arrow", label: "箭头", aliases: ["箭头", "连接线", "连线"] },
  { key: "text", label: "文字", aliases: ["文字", "文本", "字"] },
];

export function findShape(input: string): ShapeInfo | undefined {
  return SHAPES.find((shape) => shape.aliases.some((alias) => input.includes(alias)));
}

export function shapeLabel(shape?: VoiceShape): string {
  return SHAPES.find((item) => item.key === shape)?.label ?? "";
}
