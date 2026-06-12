import { Download, Eraser, Mic, MicOff, Play, RotateCcw, Sparkles } from "lucide-react";
import type { CommandLogEntry, ParsedCommand, ValidateResult } from "../command/types";
import { CommandLog } from "./CommandLog";
import { ConfirmBox } from "./ConfirmBox";
import type { ShapeRef } from "../command/types";

type VoicePanelProps = {
  transcript: string;
  manualText: string;
  listening: boolean;
  supported: boolean;
  microphoneAvailable: boolean;
  busy: boolean;
  latestParsed: ParsedCommand | null;
  logs: CommandLogEntry[];
  confirmation: Extract<ValidateResult, { kind: "need_confirm" }> | null;
  examples: string[];
  onManualTextChange: (value: string) => void;
  onStart: () => void;
  onStop: () => void;
  onExecute: (text?: string) => void;
  onResetTranscript: () => void;
  onQuickCommand: (text: string) => void;
  onConfirmChoose: (candidate: ShapeRef) => void;
  onConfirmCancel: () => void;
};

export function VoicePanel({
  transcript,
  manualText,
  listening,
  supported,
  microphoneAvailable,
  busy,
  latestParsed,
  logs,
  confirmation,
  examples,
  onManualTextChange,
  onStart,
  onStop,
  onExecute,
  onResetTranscript,
  onQuickCommand,
  onConfirmChoose,
  onConfirmCancel,
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
        <button title="执行识别文本" type="button" onClick={() => onExecute()} disabled={busy}>
          <Play size={18} />
        </button>
        <button title="清空识别文本" type="button" onClick={onResetTranscript}>
          <Eraser size={18} />
        </button>
      </div>

      {!supported && <div className="notice">当前浏览器不支持 Web Speech API，请使用手动输入演示。</div>}
      {!microphoneAvailable && <div className="notice">麦克风不可用或未授权，手动输入仍可执行。</div>}

      <div className="panel-section">
        <div className="section-title">当前识别</div>
        <div className="transcript-box">{transcript || "点击麦克风后开始说话"}</div>
      </div>

      <div className="panel-section">
        <div className="section-title">手动兜底</div>
        <textarea
          value={manualText}
          onChange={(event) => onManualTextChange(event.target.value)}
          placeholder="例如：画一个红色圆形"
        />
        <button className="primary-button" type="button" onClick={() => onExecute(manualText)} disabled={busy}>
          <Sparkles size={18} />
          执行指令
        </button>
      </div>

      <ConfirmBox confirmation={confirmation} onChoose={onConfirmChoose} onCancel={onConfirmCancel} />

      <div className="panel-section">
        <div className="section-title">解析结果</div>
        <pre className="parsed-box">{latestParsed ? JSON.stringify(latestParsed.commands, null, 2) : "暂无解析结果"}</pre>
      </div>

      <div className="panel-section">
        <div className="section-title">示例指令</div>
        <div className="example-list">
          {examples.map((example) => (
            <button type="button" key={example} onClick={() => onQuickCommand(example)}>
              {example}
            </button>
          ))}
        </div>
      </div>

      <CommandLog entries={logs} />

      <div className="panel-section quick-actions">
        <button type="button" onClick={() => onQuickCommand("撤销上一步")}>
          <RotateCcw size={16} />
          撤销
        </button>
        <button type="button" onClick={() => onQuickCommand("导出图片")}>
          <Download size={16} />
          导出
        </button>
      </div>
    </aside>
  );
}
