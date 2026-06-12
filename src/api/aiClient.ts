import type { ParsedCommand } from "../command/types";

export async function parseWithAi(text: string, sceneSummary: string): Promise<ParsedCommand> {
  const response = await fetch("/api/ai/parse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, sceneSummary }),
  });

  const data = (await response.json()) as ParsedCommand | { error: string };
  if (!response.ok || "error" in data) {
    throw new Error("error" in data ? data.error : "AI 解析失败");
  }
  return data;
}
