import type { CommandLogEntry } from "../command/types";

type CommandLogProps = {
  entries: CommandLogEntry[];
};

export function CommandLog({ entries }: CommandLogProps) {
  return (
    <div className="panel-section">
      <div className="section-title">执行记录</div>
      <div className="command-log">
        {entries.length === 0 ? (
          <div className="empty-state">等待第一条语音指令</div>
        ) : (
          entries.slice(0, 10).map((entry) => (
            <div className={`log-entry ${entry.status}`} key={entry.id}>
              <div className="log-entry-row">
                <span className="source-badge">{entry.parserSource}</span>
                <span>{entry.status}</span>
              </div>
              <strong>{entry.spokenText}</strong>
              <p>{entry.feedback}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
