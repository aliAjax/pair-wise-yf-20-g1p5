import type { CeasefireWindow, Segment } from "../types";
import { fmt } from "../schedule";

const PALETTE = ["#1d4ed8", "#dc2626", "#f59e0b", "#0ea5e9", "#16a34a", "#9333ea"];

interface Props {
  segments: Segment[];
  windows: CeasefireWindow[];
  musicEnd: number;
  playhead: number | null;
  filter: string;
}

export function Timeline({ segments, windows, musicEnd, playhead, filter }: Props) {
  const W = 980;
  const ML = 180;
  const MR = 24;
  const TOP = 40;
  const ROW = 34;
  const BAR = 22;
  const H = TOP + segments.length * ROW + 30;
  const x = (t: number) => ML + (t / musicEnd) * (W - ML - MR);

  const ticks: number[] = [];
  for (let t = 0; t < musicEnd; t += 30000) ticks.push(t);

  const dimmed = (s: Segment) => filter !== "全部" && !s.product.includes(filter);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="timeline" role="img" aria-label="燃放时间轴">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={x(t)} y1={TOP - 12} x2={x(t)} y2={H - 24} stroke="#e2e8f0" />
          <text x={x(t)} y={TOP - 18} textAnchor="middle" className="tick">
            {fmt(t)}
          </text>
        </g>
      ))}

      {windows.map((w) => (
        <g key={w.id}>
          <rect
            x={x(w.start)}
            y={TOP - 12}
            width={x(w.end) - x(w.start)}
            height={H - 24 - (TOP - 12)}
            fill="rgba(220, 38, 38, 0.1)"
            stroke="rgba(220, 38, 38, 0.5)"
            strokeDasharray="4 3"
          />
          <text x={(x(w.start) + x(w.end)) / 2} y={H - 8} textAnchor="middle" className="window-label">
            {w.label}
          </text>
        </g>
      ))}

      <line x1={x(musicEnd)} y1={TOP - 12} x2={x(musicEnd)} y2={H - 24} stroke="#172033" strokeWidth={2} />
      <text x={x(musicEnd) - 6} y={TOP - 18} textAnchor="end" className="tick strong">
        配乐终点 {fmt(musicEnd)}
      </text>

      {segments.map((s, i) => {
        const y = TOP + i * ROW;
        const x1 = x(s.start);
        const x2 = x(s.start + s.duration);
        const w = Math.max(3, x2 - x1);
        const inside = w > 64;
        return (
          <g key={s.id} opacity={dimmed(s) ? 0.25 : 1}>
            <text x={ML - 10} y={y + BAR / 2 + 4} textAnchor="end" className="row-label">
              {s.locked ? "📌 " : ""}
              {s.name}
            </text>
            <rect
              x={x1}
              y={y}
              width={w}
              height={BAR}
              rx={5}
              fill={PALETTE[i % PALETTE.length]}
              opacity={s.locked ? 0.95 : 0.8}
              stroke={s.locked ? "#172033" : "none"}
              strokeWidth={s.locked ? 1.5 : 0}
            />
            <text
              x={inside ? x1 + 6 : x2 + 6}
              y={y + BAR / 2 + 4}
              className={inside ? "bar-label" : "bar-label outside"}
            >
              {fmt(s.start)}
            </text>
          </g>
        );
      })}

      {playhead !== null && (
        <line x1={x(playhead)} y1={TOP - 12} x2={x(playhead)} y2={H - 24} stroke="#dc2626" strokeWidth={2} />
      )}
    </svg>
  );
}
