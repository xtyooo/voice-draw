# VoiceDraw

VoiceDraw is a competition demo project for voice-first vector drawing. It uses Excalidraw as the canvas core, local command rules for fast drawing operations, and an OpenAI-compatible API for complex flowchart parsing.

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
