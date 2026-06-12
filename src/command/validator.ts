import type { DrawCommand, ShapeRef, ValidateResult } from "./types";
import type { SceneMemory } from "../memory/sceneMemory";

export function validateCommands(commands: DrawCommand[], memory: SceneMemory): ValidateResult {
  for (const command of commands) {
    const result = validateCommand(command, memory);
    if (result.kind !== "ok") {
      return result;
    }
  }
  return { kind: "ok", commands };
}

export function validateCommand(command: DrawCommand, memory: SceneMemory): ValidateResult {
  switch (command.intent) {
    case "create_shape":
    case "create_flowchart":
    case "undo":
    case "redo":
    case "clear_canvas":
    case "export_image":
      return { kind: "ok", commands: [command] };
    case "connect": {
      const from = memory.resolve(command.from);
      if (from.kind === "missing") return { kind: "failed", reason: from.reason };
      if (from.kind === "multiple") return needConfirm("起点", from.refs, command);
      const to = memory.resolve(command.to);
      if (to.kind === "missing") return { kind: "failed", reason: to.reason };
      if (to.kind === "multiple") return needConfirm("终点", to.refs, command);
      return { kind: "ok", commands: [command] };
    }
    default: {
      const target = memory.resolve(command.target);
      if (target.kind === "missing") {
        return { kind: "failed", reason: target.reason };
      }
      if (target.kind === "multiple") {
        return needConfirm("目标", target.refs, command);
      }
      return { kind: "ok", commands: [command] };
    }
  }
}

function needConfirm(label: string, candidates: ShapeRef[], command: DrawCommand): ValidateResult {
  return {
    kind: "need_confirm",
    question: `找到 ${candidates.length} 个${label}候选，请说明要操作左边的、右边的或具体文字。`,
    candidates,
    command,
  };
}
