export function normalizeText(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, "")
    .replace(/[，。！？；：]/g, (mark) => {
      const map: Record<string, string> = {
        "，": ",",
        "。": ".",
        "！": "!",
        "？": "?",
        "；": ";",
        "：": ":",
      };
      return map[mark] ?? mark;
    });
}

export function extractQuotedText(input: string): string | undefined {
  const match = input.match(/[“"']([^”"']+)[”"']/);
  return match?.[1]?.trim();
}

export function extractAfterKeyword(input: string, keywords: string[]): string | undefined {
  for (const keyword of keywords) {
    const index = input.indexOf(keyword);
    if (index >= 0) {
      const value = input.slice(index + keyword.length).replace(/[。.!！?？]$/, "").trim();
      if (value) {
        return value;
      }
    }
  }
  return undefined;
}
