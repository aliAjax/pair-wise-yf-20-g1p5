import type { AdjustNotice, Conflict } from "../types";

interface Props {
  currentConflicts: Conflict[];
  notice: AdjustNotice | null;
}

const TYPE_LABEL: Record<Conflict["type"], string> = {
  cease: "停火窗",
  distance: "安全距离",
  overlap: "点位占用",
  music: "配乐终点",
  negative: "开场越界",
};

/** 冲突时间提示：当前时间轴体检 + 最近一次调整的结果 */
export function ConflictPanel({ currentConflicts, notice }: Props) {
  return (
    <div className="conflict-panel">
      {notice && (
        <div className={`notice ${notice.ok ? "ok" : "bad"}`}>
          <b>{notice.ok ? "✓ 调整已应用并保存" : "✕ 整次调整已拒绝"}</b>
          <span>{notice.text}</span>
          <small>{notice.at}</small>
          {!notice.ok && notice.conflicts.length > 0 && (
            <ul>
              {notice.conflicts.map((c, i) => (
                <li key={i}>
                  <em>{TYPE_LABEL[c.type]}</em>
                  {c.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {currentConflicts.length === 0 ? (
        <p className="no-conflict">当前时间轴无冲突：停火窗、相邻点位安全距离、配乐终点校验全部通过。</p>
      ) : (
        <ul className="current-conflicts">
          {currentConflicts.map((c, i) => (
            <li key={i}>
              <em>{TYPE_LABEL[c.type]}</em>
              {c.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
