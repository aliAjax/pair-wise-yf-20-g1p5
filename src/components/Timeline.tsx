import type { CeaseWindow, FirePoint, Segment } from "../types";
import { colorOf } from "../categories";
import { fmtTime } from "../scheduler";

interface Props {
  segments: Segment[];
  points: FirePoint[];
  ceaseWindows: CeaseWindow[];
  musicEnd: number;
  selectedId: string | null;
  conflictIds: Set<string>;
  dimmedIds: Set<string>;
  playhead: number | null;
  onSelect: (id: string) => void;
}

const W = 1000;
const ML = 116;
const MR = 28;
const RULER_H = 30;
const LANE_H = 46;
const LANE_GAP = 10;
const BAR_H = 30;

/** 时间轴编排：按点位分泳道，标注停火窗、配乐终点与定格段落 */
export function Timeline({
  segments,
  points,
  ceaseWindows,
  musicEnd,
  selectedId,
  conflictIds,
  dimmedIds,
  playhead,
  onSelect,
}: Props) {
  const tMax = musicEnd + 8;
  const x = (t: number) => ML + (t / tMax) * (W - ML - MR);
  const H = RULER_H + points.length * (LANE_H + LANE_GAP) + 14;
  const laneY = (idx: number) => RULER_H + idx * (LANE_H + LANE_GAP);

  const ticks: number[] = [];
  for (let t = 0; t <= musicEnd; t += 30) ticks.push(t);

  return (
    <svg className="timeline" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="燃放时间轴">
      {/* 时间刻度 */}
      {ticks.map((t) => (
        <g key={t}>
          <line x1={x(t)} y1={RULER_H - 10} x2={x(t)} y2={H - 8} className="tl-grid" />
          <text x={x(t)} y={16} className="tl-tick" textAnchor="middle">
            {fmtTime(t)}
          </text>
        </g>
      ))}

      {/* 停火窗 */}
      {ceaseWindows.map((w) => (
        <g key={w.id}>
          <rect
            x={x(w.start)}
            y={RULER_H - 6}
            width={x(w.end) - x(w.start)}
            height={H - RULER_H - 4}
            className="tl-cease"
          />
          <text x={(x(w.start) + x(w.end)) / 2} y={RULER_H + 10} className="tl-cease-label" textAnchor="middle">
            停火
          </text>
        </g>
      ))}

      {/* 配乐终点 */}
      <line x1={x(musicEnd)} y1={RULER_H - 6} x2={x(musicEnd)} y2={H - 8} className="tl-music-end" />
      <text x={x(musicEnd) - 4} y={H - 12} className="tl-music-label" textAnchor="end">
        ♪ 配乐终点 {fmtTime(musicEnd)}
      </text>

      {/* 点位泳道 */}
      {points.map((p, i) => (
        <g key={p.id}>
          <text x={ML - 10} y={laneY(i) + LANE_H / 2 + 4} className="tl-lane-label" textAnchor="end">
            {p.id} · {p.name.split("·")[1] ?? p.name}
          </text>
          <line x1={ML} y1={laneY(i) + LANE_H + LANE_GAP / 2} x2={W - MR} y2={laneY(i) + LANE_H + LANE_GAP / 2} className="tl-lane-line" />
        </g>
      ))}

      {/* 段落条 */}
      {segments.map((s) => {
        const laneIdx = points.findIndex((p) => p.id === s.pointId);
        if (laneIdx < 0) return null;
        const bx = x(s.start);
        const bw = Math.max(6, x(s.start + s.duration) - bx);
        const by = laneY(laneIdx) + (LANE_H - BAR_H) / 2;
        const isSel = s.id === selectedId;
        const isConflict = conflictIds.has(s.id);
        const dimmed = dimmedIds.has(s.id);
        return (
          <g
            key={s.id}
            className={`tl-seg${dimmed ? " dimmed" : ""}`}
            onClick={() => onSelect(s.id)}
            style={{ cursor: "pointer" }}
          >
            <rect
              x={bx}
              y={by}
              width={bw}
              height={BAR_H}
              rx={6}
              fill={colorOf(s.model)}
              className={[
                "tl-bar",
                isSel ? "selected" : "",
                isConflict ? "conflict" : "",
              ].join(" ")}
            />
            <text x={bx + 6} y={by + BAR_H / 2 + 4} className="tl-seg-label">
              {s.locked ? "🔒 " : ""}
              {s.name}
            </text>
            <text x={bx + 6} y={by - 5} className="tl-seg-time">
              {fmtTime(s.start)}
            </text>
          </g>
        );
      })}

      {/* 预览播放头 */}
      {playhead !== null && (
        <line x1={x(playhead)} y1={RULER_H - 6} x2={x(playhead)} y2={H - 8} className="tl-playhead" />
      )}
    </svg>
  );
}
