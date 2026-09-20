import type { Segment } from "../types";
import { fmtTime } from "../scheduler";
import { colorOf } from "../categories";

interface Props {
  segments: Segment[];
  musicEnd: number;
  playhead: number | null;
  playing: boolean;
  onToggle: () => void;
}

/** 整场节目预览：8 倍速走带，高亮当前燃放段落 */
export function Preview({ segments, musicEnd, playhead, playing, onToggle }: Props) {
  const ordered = [...segments].sort((a, b) => a.start - b.start);
  const progress = playhead === null ? 0 : Math.min(1, playhead / musicEnd);

  return (
    <div className="preview">
      <div className="preview-bar">
        <button className="primary" onClick={onToggle}>
          {playing ? "⏸ 暂停" : "▶ 整场预览"}
        </button>
        <div className="progress">
          <i style={{ width: `${progress * 100}%` }} />
        </div>
        <span className="mono">{playhead === null ? "就绪" : `${fmtTime(playhead)} / ${fmtTime(musicEnd)}`}</span>
      </div>
      <ol className="event-list">
        {ordered.map((s) => {
          const active = playhead !== null && playhead >= s.start && playhead < s.start + s.duration;
          return (
            <li key={s.id} className={active ? "active" : ""}>
              <span className="mono">{fmtTime(s.start)}</span>
              <i className="dot" style={{ background: colorOf(s.model) }} />
              <b>{s.name}</b>
              <small>
                {s.pointId}点 · {s.model} · {s.shots}发{s.locked ? " · 🔒定格" : ""}
              </small>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
