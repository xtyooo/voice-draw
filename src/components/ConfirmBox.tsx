import type { ValidateResult } from "../command/types";
import { colorLabel } from "../utils/colorMap";
import { shapeLabel } from "../utils/shapeMap";

type ConfirmBoxProps = {
  confirmation: Extract<ValidateResult, { kind: "need_confirm" }> | null;
};

export function ConfirmBox({ confirmation }: ConfirmBoxProps) {
  if (!confirmation) {
    return null;
  }

  return (
    <div className="confirm-box">
      <div>
        <div className="section-title">需要确认</div>
        <p>{confirmation.question}</p>
      </div>
      <div className="candidate-list">
        {confirmation.candidates.map((candidate, index) => (
          <div className="candidate-button" key={candidate.id}>
            <span>
              {index + 1}.{" "}
              {colorLabel(candidate.color)}
              {shapeLabel(candidate.shape)}
            </span>
            <small>
              {candidate.text || "无文字"} · 说“第 {index + 1} 个”或位置词选择
            </small>
          </div>
        ))}
      </div>
      <p className="confirm-hint">可以说“第二个”“左边那个”，也可以说“取消”。</p>
    </div>
  );
}
