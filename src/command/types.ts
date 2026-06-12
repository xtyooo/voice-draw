import type { VoiceColor } from "../utils/colorMap";
import type { VoiceShape } from "../utils/shapeMap";

export type ParserSource = "rule" | "ai" | "fallback";

export type PositionKeyword = "center" | "left" | "right" | "top" | "bottom";
export type Direction = "left" | "right" | "up" | "down";

export type TargetRef =
  | { kind: "last"; shape?: VoiceShape }
  | { kind: "selected" }
  | { kind: "by_id"; id: string }
  | { kind: "by_text"; text: string }
  | { kind: "by_type_color"; shape?: VoiceShape; color?: VoiceColor; position?: PositionKeyword }
  | { kind: "ordinal"; index: number; shape?: VoiceShape }
  | { kind: "position"; position: PositionKeyword; shape?: VoiceShape; color?: VoiceColor };

export type ShapeStyle = {
  strokeColor?: string;
  backgroundColor?: string;
  color?: VoiceColor;
};

export type CreateShapeCommand = {
  intent: "create_shape";
  shape: VoiceShape;
  text?: string;
  style?: ShapeStyle;
  layout?: {
    position?: PositionKeyword;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
};

export type UpdateShapeCommand = {
  intent: "update_shape";
  target: TargetRef;
  changes: {
    backgroundColor?: string;
    strokeColor?: string;
    color?: VoiceColor;
    scale?: number;
    text?: string;
  };
};

export type MoveShapeCommand = {
  intent: "move_shape";
  target: TargetRef;
  direction?: Direction;
  distance?: number;
  position?: PositionKeyword;
};

export type DeleteShapeCommand = {
  intent: "delete_shape";
  target: TargetRef;
};

export type SelectShapeCommand = {
  intent: "select_shape";
  target: TargetRef;
};

export type ConnectCommand = {
  intent: "connect";
  from: TargetRef;
  to: TargetRef;
  label?: string;
  lineType: "arrow";
};

export type FlowNode = {
  id: string;
  text: string;
  type?: "start" | "step" | "condition" | "end";
};

export type FlowEdge = {
  from: string;
  to: string;
  label?: string;
};

export type CreateFlowchartCommand = {
  intent: "create_flowchart";
  title?: string;
  nodes?: FlowNode[];
  edges?: FlowEdge[];
  mermaid?: string;
};

export type UtilityCommand =
  | { intent: "undo" }
  | { intent: "redo" }
  | { intent: "clear_canvas" }
  | { intent: "export_image" };

export type DrawCommand =
  | CreateShapeCommand
  | UpdateShapeCommand
  | MoveShapeCommand
  | DeleteShapeCommand
  | SelectShapeCommand
  | ConnectCommand
  | CreateFlowchartCommand
  | UtilityCommand;

export type ParsedCommand = {
  source: ParserSource;
  text: string;
  commands: DrawCommand[];
  explanation: string;
  estimatedCost?: number;
};

export type ShapeRef = {
  id: string;
  shape: VoiceShape;
  text?: string;
  color?: VoiceColor;
  x: number;
  y: number;
  width: number;
  height: number;
  createdAt: number;
  aliases: string[];
};

export type ValidateResult =
  | { kind: "ok"; commands: DrawCommand[] }
  | { kind: "failed"; reason: string }
  | { kind: "need_confirm"; question: string; candidates: ShapeRef[]; command: DrawCommand };

export type CommandLogEntry = {
  id: string;
  spokenText: string;
  parserSource: ParserSource;
  status: "success" | "failed" | "confirm" | "pending";
  feedback: string;
  createdAt: number;
  commands?: DrawCommand[];
};
