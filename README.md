# VoiceDraw

VoiceDraw is a competition demo project for voice-first vector drawing. It uses Excalidraw as the canvas core, local command rules for fast drawing operations, and an OpenAI-compatible API for complex flowchart parsing.

## Competition Deliverables

- App: voice-only Excalidraw canvas with browser ASR, local command parsing, AI flowchart parsing, and ambiguity confirmation.
- Design document: [`docs/design.md`](docs/design.md)
- Demo script: [`docs/demo-script.md`](docs/demo-script.md)
- Supported commands: [`docs/supported-commands.md`](docs/supported-commands.md)

## SDD Workflow

This project follows Specification-Driven Development:

1. Document intent, command contracts, and acceptance cases in `docs/`.
2. Implement the command pipeline against those contracts.
3. Verify parser, memory, AI fallback, and canvas behavior with tests and a local demo.

## Development

Codex shell sessions may not inherit the nvm4w path. Prefix commands when needed:

```powershell
$env:Path = 'C:\nvm4w\nodejs;C:\Users\Administrator\AppData\Local\nvm;' + $env:Path
```

Install and run:

```powershell
npm install
npm run dev
```

Run the full app with the local API server:

```powershell
npm run dev:full
```

`dev:full` uses fixed project ports so it cannot silently show a different local app:

- Web: `http://127.0.0.1:5177`
- API: `http://127.0.0.1:8788`

## Voice Recognition / ASR

The current competition version already includes ASR through `react-speech-recognition`, which wraps the browser Web Speech API. Use a Chromium-based browser, allow microphone access, click the microphone button, then speak commands directly. The microphone button only starts or stops browser listening; drawing, editing, confirmation, and export commands still run through speech. Drawing commands auto-run after a short pause; there is no manual drawing input in competition mode.

External ASR services or local Whisper are not required for the current demo. They are documented as follow-up options in [`docs/design.md`](docs/design.md) for browsers or venues where Web Speech API quality is not enough.

## AI Configuration

Create `.env` from `.env.example`:

```text
OPENAI_API_KEY=your_key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4.1-mini
PORT=8788
VOICEDRAW_WEB_PORT=5177
```

The browser never receives the API key. The frontend calls `/api/ai/parse`, and the Node server calls the OpenAI-compatible chat completions endpoint.

DashScope and other OpenAI-compatible services can use the same variables:

```text
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
OPENAI_MODEL=qwen3.6-plus
```

VoiceDraw asks the model for JSON first. If a compatible provider does not support `response_format`, the server retries once without that option and still extracts JSON from plain text or fenced `json` blocks. The server validates every AI command before the frontend sees it, rejecting unknown intents, incomplete commands, and empty results. This keeps the demo usable when different model gateways return slightly different formats.

## Core Demo Commands

- `画一个红色圆形`
- `画一个蓝色矩形`
- `在中间写“用户登录”`
- `画一条从圆形到矩形的箭头`
- `把刚才的矩形放大一点`
- `选中蓝色的节点`
- `把它往右移动一点`
- `删除左边的红色圆形`
- `撤销上一步`
- `清空画布`
- `画一个登录流程图，从输入账号密码开始，接着校验信息，成功后进入首页，失败后提示重新输入`

## Verification

```powershell
npm run test
npm run build
```
