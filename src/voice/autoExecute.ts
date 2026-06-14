type AutoExecuteInput = {
  transcript: string;
  busy: boolean;
  lastExecutedText?: string;
};

export function getAutoExecutableTranscript(input: AutoExecuteInput): string | null {
  const text = input.transcript.trim();
  if (!text || input.busy || text === input.lastExecutedText) {
    return null;
  }
  return text;
}
