import type { ParsedCommand } from "../command/types";

export async function parseWithAi(text: string, sceneSummary: string): Promise<ParsedCommand> {
  const response = await fetch("/api/ai/parse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, sceneSummary }),
  });

  const body = await response.text();
  if (!body.trim()) {
    throw new Error("AI 解析服务暂时没有返回内容，请确认本地 API 服务已启动，或换成分步语音指令。");
  }

  let data: ParsedCommand | { error: string };
  try {
    data = JSON.parse(body) as ParsedCommand | { error: string };
  } catch {
    throw new Error("AI 解析服务返回格式无效，请稍后重试或换成分步语音指令。");
  }

  if (!response.ok || "error" in data) {
    throw new Error("error" in data ? data.error : "AI 解析失败");
  }
  return data;
}
