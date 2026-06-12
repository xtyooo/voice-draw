import type { ShapeRef, ValidateResult } from "../command/types";
import { colorLabel } from "../utils/colorMap";
import { shapeLabel } from "../utils/shapeMap";

type ConfirmBoxProps = {
  confirmation: Extract<ValidateResult, { kind: "need_confirm" }> | null;
  onChoose: (candidate: ShapeRef) => void;
  onCancel: () => void;
};

export function ConfirmBox({ confirmation, onChoose, onCancel }: ConfirmBoxProps) {
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
        {confirmation.candidates.map((candidate) => (
          <button className="candidate-button" key={candidate.id} type="button" onClick={() => onChoose(candidate)}>
            <span>
              {colorLabel(candidate.color)}
              {shapeLabel(candidate.shape)}
            </span>
            <small>
              {candidate.text || "无文字"} · x {Math.round(candidate.x)}
            </small>
          </button>
        ))}
      </div>
      <button className="ghost-button" type="button" onClick={onCancel}>
        取消
      </button>
    </div>
  );
}
