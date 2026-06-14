import "dotenv/config";
import cors from "cors";
import express from "express";
import OpenAI from "openai";
import { z } from "zod";
import {
  buildParsedAiCommand,
  createChatCompletionWithJsonFallback,
  type ChatClient,
} from "./aiParser";

const requestSchema = z.object({
  text: z.string().min(1),
  sceneSummary: z.string().optional().default(""),
});

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    aiConfigured: Boolean(process.env.OPENAI_API_KEY),
    model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
  });
});

app.post("/api/ai/parse", async (req, res) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "请求格式无效" });
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    res.status(503).json({ error: "AI 解析未配置：请设置 OPENAI_API_KEY" });
    return;
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
  });

  try {
    const completion = await createChatCompletionWithJsonFallback(client as unknown as ChatClient, {
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content:
            "你是 VoiceDraw 的命令解析器。只返回 JSON，不要写 Markdown。复杂流程图优先返回 mermaid，建议使用 flowchart TD。commands 必须是数组，mermaid 可选，estimatedCost 可选，explanation 用中文简短说明。",
        },
        {
          role: "user",
          content: JSON.stringify({
            instruction: parsed.data.text,
            sceneSummary: parsed.data.sceneSummary,
            commandContract:
              "支持 intent: create_shape, update_shape, move_shape, delete_shape, select_shape, connect, create_flowchart, undo, redo, clear_canvas, export_image。复杂流程图可返回 { commands:[{intent:'create_flowchart', mermaid:'...'}], mermaid:'...' }。",
          }),
        },
      ],
    });

    const content = completion.choices[0]?.message.content;
    if (!content) {
      res.status(502).json({ error: "AI 没有返回内容" });
      return;
    }

    res.json(buildParsedAiCommand({
      text: parsed.data.text,
      content,
      totalTokens: completion.usage?.total_tokens,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 解析失败";
    res.status(502).json({ error: message });
  }
});

const port = Number(process.env.PORT || process.env.VOICEDRAW_API_PORT || 8788);
app.listen(port, () => {
  console.log(`VoiceDraw API listening on http://127.0.0.1:${port}`);
});

