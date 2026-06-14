import type { SceneMemory } from "../memory/sceneMemory";
import { validateCommand } from "./validator";
import type { DrawCommand, ValidateResult } from "./types";

type ExecuteOne = (command: DrawCommand) => Promise<{ feedback: string }>;

export type CommandExecutionResult =
  | { kind: "success"; feedback: string }
  | Exclude<ValidateResult, { kind: "ok" }>;

export async function executeValidatedCommands(input: {
  commands: DrawCommand[];
  memory: SceneMemory;
  executeOne: ExecuteOne;
}): Promise<CommandExecutionResult> {
  const feedback: string[] = [];

  for (const command of input.commands) {
    const validation = validateCommand(command, input.memory);
    if (validation.kind !== "ok") {
      return validation;
    }

    const result = await input.executeOne(command);
    feedback.push(result.feedback);
  }

  return { kind: "success", feedback: feedback.at(-1) ?? "命令已执行" };
}
