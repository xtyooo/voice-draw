# VoiceDraw SDD Specification

## Product Goal

VoiceDraw is a voice-first vector drawing tool for competition demonstration. Users should be able to create, edit, delete, connect, undo, clear, export, and generate flowcharts without using mouse or keyboard drawing tools.

## User Scenarios

- A presenter says `画一个红色圆形`, and the canvas creates a red ellipse in the center.
- A presenter says `把刚才的矩形放大一点`, and VoiceDraw resolves `刚才` through scene memory.
- A presenter says `删除左边的红色圆形` after ambiguity, and VoiceDraw uses position disambiguation.
- A presenter says a full flowchart requirement, and VoiceDraw calls an OpenAI-compatible API to produce Mermaid/JSON, validates it, and draws editable Excalidraw elements.

## Success Criteria

- Local rules cover the required MVP commands without AI calls.
- Complex flowchart requests call `/api/ai/parse` only when needed.
- API secrets stay server-side.
- Ambiguous targets produce a confirmation prompt instead of a destructive action.
- The demo can run without API credentials for local drawing and clearly explains that AI parsing is not configured.
- Logs show command text, parser source, status, and feedback.

## Non Goals

- VoiceDraw is not a raster image generator.
- VoiceDraw does not fork or deeply modify Excalidraw.
- VoiceDraw does not implement offline Whisper in the competition display version.
- VoiceDraw does not provide multi-user collaboration in this version.

## Demo Path

1. Basic drawing: create colored shapes and text by voice.
2. Voice editing: select, move, resize, recolor, delete, undo.
3. Flowchart generation: say a login or payment flow requirement and generate an editable diagram.
4. Resilience: show ambiguity handling and AI-not-configured fallback.

## Runtime Assumptions

- Browser speech recognition works best in Chromium browsers.
- The local API server listens on `PORT`, `VOICEDRAW_API_PORT`, or `8788`; the competition web demo uses `http://127.0.0.1:5177`.
- `OPENAI_BASE_URL` is OpenAI-compatible and includes a `/chat/completions` route.
