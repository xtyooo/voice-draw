import { Mic, MicOff } from "lucide-react";
import type { CommandLogEntry, ParsedCommand, ValidateResult } from "../command/types";
import { CommandLog } from "./CommandLog";
import { ConfirmBox } from "./ConfirmBox";

type VoicePanelProps = {
  transcript: string;
  listening: boolean;
  supported: boolean;
  microphoneAvailable: boolean;
  busy: boolean;
  latestParsed: ParsedCommand | null;
  logs: CommandLogEntry[];
  confirmation: Extract<ValidateResult, { kind: "need_confirm" }> | null;
  examples: string[];
  onStart: () => void;
  onStop: () => void;
};

export function VoicePanel({
  transcript,
  listening,
  supported,
  microphoneAvailable,
  busy,
  latestParsed,
  logs,
  confirmation,
  examples,
  onStart,
  onStop,
}: VoicePanelProps) {
  return (
    <aside className="voice-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Voice Console</p>
          <h1>VoiceDraw</h1>
        </div>
        <div className={`mic-state ${listening ? "listening" : ""}`}>{listening ? "正在听" : "待命"}</div>
      </div>

      <div className="toolbar">
        <button title="开始语音识别" type="button" onClick={onStart} disabled={!supported || busy || listening}>
          <Mic size={18} />
        </button>
        <button title="停止语音识别" type="button" onClick={onStop} disabled={!listening}>
          <MicOff size={18} />
        </button>
      </div>

      {!supported && <div className="notice">当前浏览器不支持 Web Speech API，请使用 Chromium 内核浏览器演示。</div>}
      {!microphoneAvailable && <div className="notice">麦克风不可用或未授权，请授权麦克风后继续。</div>}

      <div className="panel-section">
        <div className="section-title">当前识别</div>
        <div className="transcript-box">{transcript || "点击麦克风后直接说绘图指令，停顿片刻会自动执行"}</div>
      </div>

      <ConfirmBox confirmation={confirmation} />

      <div className="panel-section">
        <div className="section-title">解析结果</div>
        <pre className="parsed-box">{latestParsed ? JSON.stringify(latestParsed.commands, null, 2) : "暂无解析结果"}</pre>
      </div>

      <div className="panel-section">
        <div className="section-title">可说的示例</div>
        <div className="example-list read-only">
          {examples.map((example) => (
            <span key={example}>
              {example}
            </span>
          ))}
        </div>
      </div>

      <CommandLog entries={logs} />
    </aside>
  );
}
