import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { ExcalidrawCanvas } from "./canvas/ExcalidrawCanvas";
import { ExcalidrawAdapter } from "./canvas/excalidrawAdapter";
import { executeValidatedCommands } from "./command/commandExecutor";
import { parseCommandText } from "./command/commandRouter";
import type { CommandLogEntry, DrawCommand, ParsedCommand, ShapeRef, ValidateResult } from "./command/types";
import { resolveVoiceConfirmation } from "./command/voiceConfirmation";
import { parseWithAi } from "./api/aiClient";
import { SceneMemory } from "./memory/sceneMemory";
import { getAutoExecutableTranscript } from "./voice/autoExecute";
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
  const lastExecutedTextRef = useRef("");
  const [logs, setLogs] = useState<CommandLogEntry[]>([]);
  const [latestParsed, setLatestParsed] = useState<ParsedCommand | null>(null);
  const [confirmation, setConfirmation] = useState<Extract<ValidateResult, { kind: "need_confirm" }> | null>(null);
  const [busy, setBusy] = useState(false);
  const [latestAction, setLatestAction] = useState("");
  const [aiCalls, setAiCalls] = useState(0);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [elementCount, setElementCount] = useState(0);

  const voice = useVoiceInput();
  const { resetTranscript, transcript } = voice;

  const addLog = useCallback((entry: CommandLogEntry) => {
    setLogs((items) => [entry, ...items].slice(0, 20));
  }, []);

  function handleReady(api: ExcalidrawImperativeAPI) {
    apiRef.current = api;
    adapterRef.current = new ExcalidrawAdapter(api, memory);
    setElementCount(api.getSceneElements().length);
  }

  function handleSceneChange() {
    adapterRef.current?.syncMemory();
    setElementCount(apiRef.current?.getSceneElements().length ?? 0);
  }

  const executeCommands = useCallback(async (commands: DrawCommand[]) => {
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
  }, []);

  const applyConfirmation = useCallback(
    async (
      activeConfirmation: Extract<ValidateResult, { kind: "need_confirm" }>,
      candidate: ShapeRef,
      spokenText: string,
    ) => {
      memory.select(candidate.id);
      setConfirmation(null);
      const command = retargetCommand(activeConfirmation.command, candidate, activeConfirmation.role);
      const feedback = await executeCommands([command]);
      addLog({
        id: crypto.randomUUID(),
        spokenText,
        parserSource: "rule",
        status: "success",
        feedback,
        createdAt: createTimestamp(),
        commands: [command],
      });
      setLatestAction(feedback);
      return feedback;
    },
    [addLog, executeCommands, memory],
  );

  const executeText = useCallback(
    async (textOverride?: string) => {
      const text = (textOverride ?? transcript).trim();
      if (!text || !adapterRef.current) {
        return;
      }

      setBusy(true);
      const startedAt = createTimestamp();
      try {
        if (confirmation) {
          const answer = resolveVoiceConfirmation(text, confirmation.candidates);
          if (answer.kind === "choose") {
            await applyConfirmation(confirmation, answer.candidate, text);
            return;
          }
          if (answer.kind === "cancel") {
            setConfirmation(null);
            addLog({
              id: crypto.randomUUID(),
              spokenText: text,
              parserSource: "rule",
              status: "success",
              feedback: "已取消本次确认",
              createdAt: startedAt,
            });
            setLatestAction("已取消本次确认");
            return;
          }
          if (shouldWaitForConfirmationAnswer(text)) {
            addLog({
              id: crypto.randomUUID(),
              spokenText: text,
              parserSource: "rule",
              status: "confirm",
              feedback: "请说第几个、左边那个、右边那个，或说取消。",
              createdAt: startedAt,
            });
            setLatestAction("等待语音确认");
            return;
          }
          setConfirmation(null);
        }

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

        const execution = await executeValidatedCommands({
          commands: parsed.commands,
          memory,
          executeOne: async (command) => {
            const feedback = await executeCommands([command]);
            return { feedback };
          },
        });
        if (execution.kind === "need_confirm") {
          setConfirmation(execution);
          addLog({
            id: crypto.randomUUID(),
            spokenText: text,
            parserSource: parsed.source,
            status: "confirm",
            feedback: execution.question,
            createdAt: startedAt,
            commands: parsed.commands,
          });
          return;
        }
        if (execution.kind === "failed") {
          addLog({
            id: crypto.randomUUID(),
            spokenText: text,
            parserSource: parsed.source,
            status: "failed",
            feedback: execution.reason,
            createdAt: startedAt,
            commands: parsed.commands,
          });
          setLatestAction(execution.reason);
          return;
        }

        addLog({
          id: crypto.randomUUID(),
          spokenText: text,
          parserSource: parsed.source,
          status: "success",
          feedback: execution.feedback,
          createdAt: startedAt,
          commands: parsed.commands,
        });
        setLatestAction(execution.feedback);
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
        lastExecutedTextRef.current = text;
        resetTranscript();
        setBusy(false);
      }
    },
    [addLog, applyConfirmation, confirmation, executeCommands, memory, resetTranscript, transcript],
  );

  useEffect(() => {
    const text = getAutoExecutableTranscript({
      transcript: voice.transcript,
      busy,
      lastExecutedText: lastExecutedTextRef.current,
    });
    if (!text) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      void executeText(text);
    }, 650);
    return () => window.clearTimeout(timer);
  }, [busy, executeText, voice.transcript]);

  return (
    <div className="app-shell">
      <VoicePanel
        transcript={voice.transcript}
        listening={voice.listening}
        supported={voice.supported}
        microphoneAvailable={voice.microphoneAvailable}
        busy={busy}
        latestParsed={latestParsed}
        logs={logs}
        confirmation={confirmation}
        examples={examples}
        onStart={voice.start}
        onStop={voice.stop}
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

function shouldWaitForConfirmationAnswer(text: string) {
  return /第|号|左|右|上|下|这个|那个|就|选/.test(text);
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
