import { parseRuleCommand, requiresAiParsing } from "./ruleParser";
import type { ParsedCommand } from "./types";

export type AiParseClient = (text: string, sceneSummary: string) => Promise<ParsedCommand>;

export async function parseCommandText(input: {
  text: string;
  sceneSummary: string;
  parseWithAi: AiParseClient;
}): Promise<ParsedCommand> {
  const local = parseRuleCommand(input.text);
  if (local && (!requiresAiParsing(input.text) || shouldPreferLocal(local))) {
    return local;
  }

  try {
    return await input.parseWithAi(input.text, input.sceneSummary);
  } catch (error) {
    const local = parseRuleCommand(input.text);
    if (local) {
      return {
        ...local,
        source: "fallback",
        explanation: `${local.explanation}；AI 解析不可用，已降级为本地规则。`,
      };
    }
    throw error;
  }
}

function shouldPreferLocal(parsed: ParsedCommand): boolean {
  return parsed.commands.length > 1;
}
