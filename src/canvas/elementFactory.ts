import type { ExcalidrawElementSkeleton } from "@excalidraw/excalidraw/data/transform";
import { getColorInfo } from "../utils/colorMap";
import type { CreateShapeCommand, PositionKeyword, ShapeRef } from "../command/types";
import type { VoiceColor } from "../utils/colorMap";
import type { VoiceShape } from "../utils/shapeMap";

export type CanvasSize = {
  width: number;
  height: number;
};

const DEFAULT_CANVAS: CanvasSize = { width: 1200, height: 800 };

export function createShapeSkeleton(command: CreateShapeCommand, canvas = DEFAULT_CANVAS): ExcalidrawElementSkeleton {
  const layout = command.layout ?? {};
  const width = layout.width ?? (command.shape === "text" ? 220 : 170);
  const height = layout.height ?? (command.shape === "text" ? 42 : 90);
  const point = resolvePoint(layout.position ?? "center", canvas, width, height);
  const x = layout.x ?? point.x;
  const y = layout.y ?? point.y;
  const style = resolveStyle(command.style?.color, command.style?.strokeColor, command.style?.backgroundColor);

  if (command.shape === "text") {
    return {
      type: "text",
      text: command.text ?? "",
      x,
      y,
      width,
      height,
      fontSize: 28,
      strokeColor: style.strokeColor,
      backgroundColor: "transparent",
    };
  }

  return {
    type: command.shape,
    x,
    y,
    width,
    height,
    strokeColor: style.strokeColor,
    backgroundColor: style.backgroundColor,
    roughness: 1,
    strokeWidth: 2,
    label: command.text
      ? {
          text: command.text,
          fontSize: 24,
        }
      : undefined,
  } satisfies ExcalidrawElementSkeleton;
}

export function createArrowSkeleton(from: ShapeRef, to: ShapeRef, label?: string): ExcalidrawElementSkeleton {
  const start = centerOf(from);
  const end = centerOf(to);
  return {
    type: "arrow",
    x: start.x,
    y: start.y,
    points: [
      [0, 0],
      [end.x - start.x, end.y - start.y],
    ],
    strokeColor: "#1e1e1e",
    strokeWidth: 2,
    endArrowhead: "arrow",
    label: label
      ? {
          text: label,
          fontSize: 20,
        }
      : undefined,
  } as ExcalidrawElementSkeleton;
}

export function refFromElement(element: ElementLike, shape: VoiceShape, color?: VoiceColor): ShapeRef {
  return {
    id: element.id,
    shape,
    color,
    text: element.text,
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
    createdAt: Date.now(),
    aliases: [],
  };
}

export function resolvePoint(position: PositionKeyword, canvas = DEFAULT_CANVAS, width: number, height: number) {
  const margin = 120;
  if (position === "left") return { x: margin, y: canvas.height / 2 - height / 2 };
  if (position === "right") return { x: canvas.width - width - margin, y: canvas.height / 2 - height / 2 };
  if (position === "top") return { x: canvas.width / 2 - width / 2, y: margin };
  if (position === "bottom") return { x: canvas.width / 2 - width / 2, y: canvas.height - height - margin };
  return { x: canvas.width / 2 - width / 2, y: canvas.height / 2 - height / 2 };
}

function centerOf(ref: ShapeRef) {
  return {
    x: ref.x + ref.width / 2,
    y: ref.y + ref.height / 2,
  };
}

function resolveStyle(color?: VoiceColor, strokeColor?: string, backgroundColor?: string) {
  if (color) {
    const colorInfo = getColorInfo(color);
    return {
      strokeColor: strokeColor ?? colorInfo.strokeColor,
      backgroundColor: backgroundColor ?? colorInfo.backgroundColor,
    };
  }
  return {
    strokeColor: strokeColor ?? "#1e1e1e",
    backgroundColor: backgroundColor ?? "#ffffff",
  };
}

type ElementLike = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
};
