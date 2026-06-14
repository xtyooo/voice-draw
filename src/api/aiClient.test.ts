import { afterEach, describe, expect, it, vi } from "vitest";
import { parseWithAi } from "./aiClient";

describe("parseWithAi", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns a friendly message when the AI endpoint responds with an empty body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        text: vi.fn().mockResolvedValue(""),
      }),
    );

    await expect(parseWithAi("在正方形的右面接一个圆形", "")).rejects.toThrow(
      "AI 解析服务暂时没有返回内容，请确认本地 API 服务已启动，或换成分步语音指令。",
    );
  });

  it("keeps backend error messages when the AI endpoint returns JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        text: vi.fn().mockResolvedValue(JSON.stringify({ error: "AI 解析未配置" })),
      }),
    );

    await expect(parseWithAi("画流程图", "")).rejects.toThrow("AI 解析未配置");
  });
});
