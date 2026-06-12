import { useMemo, useRef, useState } from "react";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { ExcalidrawCanvas } from "./canvas/ExcalidrawCanvas";
import { ExcalidrawAdapter } from "./canvas/excalidrawAdapter";
import { parseCommandText } from "./command/commandRouter";
import { validateCommands } from "./command/validator";
import type { CommandLogEntry, DrawCommand, ParsedCommand, ShapeRef, ValidateResult } from "./command/types";
import { parseWithAi } from "./api/aiClient";
import { SceneMemory } from "./memory/sceneMemory";
import { useVoiceInput } from "./voice/useVoiceInput";
import { VoicePanel } from "./components/VoicePanel";
import { StatusBar } from "./components/StatusBar";
import "./App.css";

const examples = [
  "画一个红色圆形",
  "画一个蓝色矩形",
  "在中间写“用户登录”",
  "画一条从圆形到矩形的箭头",
  "把刚才的矩形放大一点",
  "画一个登录流程图，从输入账号密码开始，接着校验信息，成功后进入首页，失败后提示重新输入",
];

function App() {
  const memory = useMemo(() => new SceneMemory(), []);
  const adapterRef = useRef<ExcalidrawAdapter | null>(null);
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const [manualText, setManualText] = useState("");
  const [logs, setLogs] = useState<CommandLogEntry[]>([]);
  const [latestParsed, setLatestParsed] = useState<ParsedCommand | null>(null);
  const [confirmation, setConfirmation] = useState<Extract<ValidateResult, { kind: "need_confirm" }> | null>(null);
  const [busy, setBusy] = useState(false);
  const [latestAction, setLatestAction] = useState("");
  const [aiCalls, setAiCalls] = useState(0);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [elementCount, setElementCount] = useState(0);

  const voice = useVoiceInput();

  function handleReady(api: ExcalidrawImperativeAPI) {
    apiRef.current = api;
    adapterRef.current = new ExcalidrawAdapter(api, memory);
    setElementCount(api.getSceneElements().length);
  }

  function handleSceneChange() {
    adapterRef.current?.syncMemory();
    setElementCount(apiRef.current?.getSceneElements().length ?? 0);
  }

  async function executeText(textOverride?: string) {
    const text = (textOverride ?? voice.transcript ?? manualText).trim();
    if (!text || !adapterRef.current) {
      return;
    }

    setBusy(true);
    const startedAt = createTimestamp();
    try {
      const parsed = await parseCommandText({
        text,
        sceneSummary: memory.summary(),
        parseWithAi,
      });
      setLatestParsed(parsed);
      if (parsed.source === "ai") {
        setAiCalls((value) => value + 1);
        setEstimatedCost((value) => value + (parsed.estimatedCost ?? 0));
      }

      const validation = validateCommands(parsed.commands, memory);
      if (validation.kind === "need_confirm") {
        setConfirmation(validation);
        addLog({
          id: crypto.randomUUID(),
          spokenText: text,
          parserSource: parsed.source,
          status: "confirm",
          feedback: validation.question,
          createdAt: startedAt,
          commands: parsed.commands,
        });
        return;
      }
      if (validation.kind === "failed") {
        addLog({
          id: crypto.randomUUID(),
          spokenText: text,
          parserSource: parsed.source,
          status: "failed",
          feedback: validation.reason,
          createdAt: startedAt,
          commands: parsed.commands,
        });
        setLatestAction(validation.reason);
        return;
      }

      const feedback = await executeCommands(validation.commands);
      addLog({
        id: crypto.randomUUID(),
        spokenText: text,
        parserSource: parsed.source,
        status: "success",
        feedback,
        createdAt: startedAt,
        commands: parsed.commands,
      });
      setLatestAction(feedback);
      setManualText("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "命令执行失败";
      addLog({
        id: crypto.randomUUID(),
        spokenText: text,
        parserSource: "ai",
        status: "failed",
        feedback: message,
        createdAt: startedAt,
      });
      setLatestAction(message);
    } finally {
      setBusy(false);
    }
  }

  async function executeCommands(commands: DrawCommand[]) {
    const adapter = adapterRef.current;
    if (!adapter) {
      return "画布尚未准备好";
    }
    const results = [];
    for (const command of commands) {
      const result = await adapter.execute(command);
      results.push(result.feedback);
    }
    setElementCount(apiRef.current?.getSceneElements().length ?? 0);
    return results.at(-1) ?? "命令已执行";
  }

  async function chooseCandidate(candidate: ShapeRef) {
    if (!confirmation) {
      return;
    }
    memory.select(candidate.id);
    setConfirmation(null);
    const command = retargetCommand(confirmation.command, candidate, confirmation.role);
    const feedback = await executeCommands([command]);
    addLog({
      id: crypto.randomUUID(),
      spokenText: "二次确认",
      parserSource: "rule",
      status: "success",
      feedback,
      createdAt: createTimestamp(),
      commands: [command],
    });
    setLatestAction(feedback);
  }

  function addLog(entry: CommandLogEntry) {
    setLogs((items) => [entry, ...items].slice(0, 20));
  }

  return (
    <div className="app-shell">
      <VoicePanel
        transcript={voice.transcript}
        manualText={manualText}
        listening={voice.listening}
        supported={voice.supported}
        microphoneAvailable={voice.microphoneAvailable}
        busy={busy}
        latestParsed={latestParsed}
        logs={logs}
        confirmation={confirmation}
        examples={examples}
        onManualTextChange={setManualText}
        onStart={voice.start}
        onStop={voice.stop}
        onExecute={executeText}
        onResetTranscript={voice.resetTranscript}
        onQuickCommand={(text) => {
          setManualText(text);
          void executeText(text);
        }}
        onConfirmChoose={chooseCandidate}
        onConfirmCancel={() => setConfirmation(null)}
      />
      <main className="canvas-shell">
        <header className="top-bar">
          <div>
            <p className="eyebrow">Competition Mode</p>
            <h2>语音控制的 Excalidraw 矢量画布</h2>
          </div>
          <div className="mode-pill">只读画布 · 语音修改</div>
        </header>
        <section className="canvas-area">
          <ExcalidrawCanvas onReady={handleReady} onSceneChange={handleSceneChange} />
        </section>
        <StatusBar
          latestAction={latestAction}
          aiCalls={aiCalls}
          estimatedCost={estimatedCost}
          elementCount={elementCount}
        />
      </main>
    </div>
  );
}

function createTimestamp() {
  return Date.now();
}

function retargetCommand(command: DrawCommand, candidate: ShapeRef, role: "target" | "from" | "to"): DrawCommand {
  const target = { kind: "by_id" as const, id: candidate.id };
  if (role === "target" && "target" in command) {
    return { ...command, target };
  }
  if (command.intent === "connect" && role === "from") {
    return { ...command, from: target };
  }
  if (command.intent === "connect" && role === "to") {
    return { ...command, to: target };
  }
  return command;
}

export default App;
