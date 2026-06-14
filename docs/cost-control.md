# Cost Control

## Strategy

- Local rule parsing handles simple drawing, editing, selection, undo, clear, and export.
- AI is called only for complex diagram generation or instructions that local rules cannot parse.
- The app sends text instructions and compact scene summaries, never full canvas screenshots.
- AI responses must be Mermaid or structured JSON and are validated before execution.
- The server retries once without `response_format` when an OpenAI-compatible provider does not support strict JSON mode.
- Repeated demo prompts can be served from local examples when API credentials are missing.

## UI Metrics

VoiceDraw tracks:

- AI call count for the current browser session.
- Estimated cost returned by the API or a conservative local estimate.
- Parser source: `rule`, `ai`, or `fallback`.

## Failure Policy

- Missing `OPENAI_API_KEY`: show clear feedback and continue local drawing.
- Network timeout: keep current canvas unchanged and log the failed AI attempt.
- Invalid response: reject it and ask the user to retry or split the command.
