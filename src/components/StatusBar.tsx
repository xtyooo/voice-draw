type StatusBarProps = {
  latestAction: string;
  aiCalls: number;
  estimatedCost: number;
  elementCount: number;
};

export function StatusBar({ latestAction, aiCalls, estimatedCost, elementCount }: StatusBarProps) {
  return (
    <footer className="status-bar">
      <div>
        <span>最近操作</span>
        <strong>{latestAction || "暂无"}</strong>
      </div>
      <div>
        <span>画布对象</span>
        <strong>{elementCount}</strong>
      </div>
      <div>
        <span>AI 调用</span>
        <strong>{aiCalls}</strong>
      </div>
      <div>
        <span>估算成本</span>
        <strong>${estimatedCost.toFixed(4)}</strong>
      </div>
    </footer>
  );
}
