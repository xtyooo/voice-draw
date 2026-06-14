import { describe, expect, it, vi } from "vitest";
import {
  buildParsedAiCommand,
  createChatCompletionWithJsonFallback,
  parseAiResponseContent,
} from "./aiParser";

describe("parseAiResponseContent", () => {
  it("parses plain JSON returned by the model", () => {
    const parsed = parseAiResponseContent(
      JSON.stringify({
        commands: [{ intent: "create_shape", shape: "rectangle" }],
        explanation: "已创建矩形",
      }),
    );

    expect(parsed.commands).toEqual([{ intent: "create_shape", shape: "rectangle" }]);
    expect(parsed.explanation).toBe("已创建矩形");
  });

  it("extracts JSON from a fenced code block", () => {
    const parsed = parseAiResponseContent(`
下面是解析结果：
\`\`\`json
{
  "commands": [
    {
      "intent": "create_flowchart",
      "mermaid": "flowchart TD\\nA[开始] --> B[结束]"
    }
  ],
  "explanation": "已生成流程图"
}
\`\`\`
`);

    expect(parsed.commands[0]).toMatchObject({ intent: "create_flowchart" });
    expect(parsed.explanation).toBe("已生成流程图");
  });

  it("uses top-level mermaid when commands are empty", () => {
    const parsed = buildParsedAiCommand({
      text: "画流程图",
      content: JSON.stringify({
        commands: [],
        mermaid: "flowchart TD\nA[开始] --> B[结束]",
      }),
      totalTokens: 25,
    });

    expect(parsed.commands).toEqual([
      { intent: "create_flowchart", mermaid: "flowchart TD\nA[开始] --> B[结束]" },
    ]);
    expect(parsed.estimatedCost).toBe(0.000025);
  });
});

describe("createChatCompletionWithJsonFallback", () => {
  it("retries without response_format when the provider does not support it", async () => {
    const create = vi
      .fn()
      .mockRejectedValueOnce(new Error("unsupported parameter: response_format"))
      .mockResolvedValueOnce({
        choices: [{ message: { content: '{"commands":[]}' } }],
        usage: { total_tokens: 10 },
      });

    const completion = await createChatCompletionWithJsonFallback(
      { chat: { completions: { create } } },
      {
        model: "qwen",
        temperature: 0.1,
        messages: [{ role: "system", content: "只返回 JSON" }],
      },
    );

    expect(completion.usage?.total_tokens).toBe(10);
    expect(create).toHaveBeenCalledTimes(2);
    expect(create.mock.calls[0][0]).toMatchObject({ response_format: { type: "json_object" } });
    expect(create.mock.calls[1][0]).not.toHaveProperty("response_format");
  });
});
