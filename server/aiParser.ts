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
      ? (json.commands as DrawCommand[])
      : json.mermaid
        ? [{ intent: "create_flowchart" as const, mermaid: json.mermaid }]
        : [];

  return {
    source: "ai",
    text: input.text,
    commands,
    estimatedCost: json.estimatedCost ?? estimateCost(input.totalTokens ?? 0),
    explanation: json.explanation ?? "AI 已解析复杂指令",
  };
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
