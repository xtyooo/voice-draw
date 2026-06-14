import { z } from "zod";
import type { DrawCommand, ParsedCommand } from "../src/command/types";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatCompletionRequest = {
  model: string;
  temperature: number;
  messages: ChatMessage[];
  response_format?: { type: "json_object" };
};

export type ChatCompletionResult = {
  choices: Array<{ message: { content?: string | null } }>;
  usage?: { total_tokens?: number | null };
};

export type ChatClient = {
  chat: {
    completions: {
      create: (body: ChatCompletionRequest) => Promise<ChatCompletionResult>;
    };
  };
};

const aiResponseSchema = z.object({
  commands: z.array(z.unknown()).default([]),
  mermaid: z.string().optional(),
  estimatedCost: z.number().optional(),
  explanation: z.string().optional(),
});

type AiResponse = z.infer<typeof aiResponseSchema>;

const voiceShapeSchema = z.enum(["rectangle", "ellipse", "diamond", "arrow", "text"]);
const voiceColorSchema = z.enum(["red", "blue", "yellow", "green", "purple", "orange", "black", "white", "gray"]);
const positionSchema = z.enum(["center", "left", "right", "top", "bottom"]);
const directionSchema = z.enum(["left", "right", "up", "down"]);

const targetRefSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("last"), shape: voiceShapeSchema.optional() }),
  z.object({ kind: z.literal("selected") }),
  z.object({ kind: z.literal("by_id"), id: z.string().min(1) }),
  z.object({ kind: z.literal("by_text"), text: z.string().min(1) }),
  z.object({ kind: z.literal("by_type_color"), shape: voiceShapeSchema.optional(), color: voiceColorSchema.optional(), position: positionSchema.optional() }),
  z.object({ kind: z.literal("ordinal"), index: z.number().int().positive(), shape: voiceShapeSchema.optional() }),
  z.object({ kind: z.literal("position"), position: positionSchema, shape: voiceShapeSchema.optional(), color: voiceColorSchema.optional() }),
]);

const shapeStyleSchema = z.object({
  strokeColor: z.string().optional(),
  backgroundColor: z.string().optional(),
  color: voiceColorSchema.optional(),
});

const createShapeCommandSchema = z
  .object({
    intent: z.literal("create_shape"),
    shape: voiceShapeSchema,
    text: z.string().optional(),
    style: shapeStyleSchema.optional(),
    layout: z
      .object({
        position: positionSchema.optional(),
        relativeTo: targetRefSchema.optional(),
        x: z.number().optional(),
        y: z.number().optional(),
        width: z.number().positive().optional(),
        height: z.number().positive().optional(),
      })
      .optional(),
  })
  .refine((command) => command.shape !== "arrow", "创建箭头必须使用 connect 命令");

const updateShapeCommandSchema = z
  .object({
    intent: z.literal("update_shape"),
    target: targetRefSchema,
    changes: z.object({
      backgroundColor: z.string().optional(),
      strokeColor: z.string().optional(),
      color: voiceColorSchema.optional(),
      scale: z.number().positive().optional(),
      text: z.string().optional(),
    }),
  })
  .refine(
    (command) => Object.values(command.changes).some((value) => value !== undefined && value !== ""),
    "编辑命令必须包含颜色、缩放或文字变化",
  );

const moveShapeCommandSchema = z
  .object({
    intent: z.literal("move_shape"),
    target: targetRefSchema,
    direction: directionSchema.optional(),
    distance: z.number().positive().optional(),
    position: positionSchema.optional(),
  })
  .refine((command) => Boolean(command.direction || command.position), "移动命令必须包含方向或目标位置");

const createFlowchartCommandSchema = z
  .object({
    intent: z.literal("create_flowchart"),
    title: z.string().optional(),
    nodes: z
      .array(
        z.object({
          id: z.string().min(1),
          text: z.string().min(1),
          type: z.enum(["start", "step", "condition", "end"]).optional(),
        }),
      )
      .optional(),
    edges: z
      .array(
        z.object({
          from: z.string().min(1),
          to: z.string().min(1),
          label: z.string().optional(),
        }),
      )
      .optional(),
    mermaid: z.string().min(1).optional(),
  })
  .refine((command) => Boolean(command.mermaid || (command.nodes?.length && command.edges?.length)), "流程图命令必须包含 Mermaid 或节点边数据");

const drawCommandSchema = z.discriminatedUnion("intent", [
  createShapeCommandSchema,
  updateShapeCommandSchema,
  moveShapeCommandSchema,
  z.object({ intent: z.literal("delete_shape"), target: targetRefSchema }),
  z.object({ intent: z.literal("select_shape"), target: targetRefSchema }),
  z.object({
    intent: z.literal("connect"),
    from: targetRefSchema,
    to: targetRefSchema,
    label: z.string().optional(),
    lineType: z.literal("arrow").default("arrow"),
  }),
  createFlowchartCommandSchema,
  z.object({ intent: z.literal("undo") }),
  z.object({ intent: z.literal("redo") }),
  z.object({ intent: z.literal("clear_canvas") }),
  z.object({ intent: z.literal("export_image") }),
]);

const drawCommandsSchema = z.array(drawCommandSchema);

export async function createChatCompletionWithJsonFallback(
  client: ChatClient,
  params: Omit<ChatCompletionRequest, "response_format">,
): Promise<ChatCompletionResult> {
  try {
    return await client.chat.completions.create({
      ...params,
      response_format: { type: "json_object" },
    });
  } catch (error) {
    if (!isUnsupportedResponseFormatError(error)) {
      throw error;
    }
    return client.chat.completions.create(params);
  }
}

export function buildParsedAiCommand(input: {
  text: string;
  content: string;
  totalTokens?: number | null;
}): ParsedCommand {
  const json = parseAiResponseContent(input.content);
  const commands: DrawCommand[] =
    json.commands.length > 0
      ? parseDrawCommands(json.commands)
      : json.mermaid
        ? [{ intent: "create_flowchart" as const, mermaid: json.mermaid }]
        : [];

  if (commands.length === 0) {
    throw new Error("AI 没有生成可执行绘图命令");
  }

  return {
    source: "ai",
    text: input.text,
    commands,
    estimatedCost: json.estimatedCost ?? estimateCost(input.totalTokens ?? 0),
    explanation: json.explanation ?? "AI 已解析复杂指令",
  };
}

function parseDrawCommands(commands: unknown[]): DrawCommand[] {
  try {
    return drawCommandsSchema.parse(commands) as DrawCommand[];
  } catch (error) {
    const detail = error instanceof z.ZodError ? `：${z.prettifyError(error)}` : "";
    throw new Error(`AI 返回的绘图命令格式无效${detail}`, { cause: error });
  }
}

export function parseAiResponseContent(content: string): AiResponse {
  const candidates = collectJsonCandidates(content);
  let lastError: unknown;

  for (const candidate of candidates) {
    try {
      return aiResponseSchema.parse(JSON.parse(candidate));
    } catch (error) {
      lastError = error;
    }
  }

  const detail = lastError instanceof Error ? `：${lastError.message}` : "";
  throw new Error(`AI 返回的 JSON 格式无法解析${detail}`);
}

function collectJsonCandidates(content: string): string[] {
  const text = content.trim();
  const candidates = new Set<string>();
  if (text) {
    candidates.add(text);
  }

  for (const match of text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)) {
    const fenced = match[1]?.trim();
    if (fenced) {
      candidates.add(fenced);
    }
  }

  const balanced = extractFirstJsonObject(text);
  if (balanced) {
    candidates.add(balanced);
  }

  return [...candidates];
}

function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start < 0) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) {
      continue;
    }
    if (char === "{") {
      depth += 1;
    }
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, index + 1);
      }
    }
  }

  return null;
}

function isUnsupportedResponseFormatError(error: unknown): boolean {
  const message = stringifyError(error).toLowerCase();
  return (
    /response_format|json_object/.test(message) &&
    /unsupported|not support|not supported|invalid|unknown|unrecognized|不支持|无效/.test(message)
  );
}

function stringifyError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name} ${error.message}`;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function estimateCost(totalTokens: number): number {
  if (!totalTokens) {
    return 0;
  }
  return Number(((totalTokens / 1000) * 0.001).toFixed(6));
}
