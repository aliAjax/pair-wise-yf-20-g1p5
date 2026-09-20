import { POINT_EDGES } from "../data";
import type { LaunchPoint, Segment } from "../types";

interface Props {
  points: LaunchPoint[];
  segments: Segment[];
}

export function PointMap({ points, segments }: Props) {
  const W = 560;
  const H = 400;
  const M = 52;
  const maxX = Math.max(...points.map((p) => p.x)) + 15;
  const maxY = Math.max(...points.map((p) => p.y)) + 15;
  const sx = (x: number) => M + (x / maxX) * (W - 2 * M);
  const sy = (y: number) => M + (y / maxY) * (H - 2 * M);
  const byId = new Map(points.map((p) => [p.id, p]));

  const grid: number[] = [];
  for (let g = 0; g <= Math.max(maxX, maxY); g += 20) grid.push(g);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="pointmap" role="img" aria-label="燃放点位平面图">
      <rect x={M} y={M} width={W - 2 * M} height={H - 2 * M} fill="#f8fafc" stroke="#d9e2ef" />
      {grid.map((g) => (
        <g key={g}>
          {g <= maxX && <line x1={sx(g)} y1={M} x2={sx(g)} y2={H - M} stroke="#e8eef6" />}
          {g <= maxY && <line x1={M} y1={sy(g)} x2={W - M} y2={sy(g)} stroke="#e8eef6" />}
        </g>
      ))}

      {POINT_EDGES.map(([a, b]) => {
        const pa = byId.get(a);
        const pb = byId.get(b);
        if (!pa || !pb) return null;
        const d = Math.hypot(pa.x - pb.x, pa.y - pb.y);
        return (
          <g key={a + b}>
            <line x1={sx(pa.x)} y1={sy(pa.y)} x2={sx(pb.x)} y2={sy(pb.y)} stroke="#94a3b8" strokeDasharray="5 4" />
            <text
              x={(sx(pa.x) + sx(pb.x)) / 2}
              y={(sy(pa.y) + sy(pb.y)) / 2 - 6}
              textAnchor="middle"
              className="map-dist"
            >
              {d.toFixed(1)}m
            </text>
          </g>
        );
      })}

      {points.map((p) => {
        const count = segments.filter((s) => s.pointId === p.id).length;
        return (
          <g key={p.id}>
            <circle cx={sx(p.x)} cy={sy(p.y)} r={13} fill="#1d4ed8" opacity={0.9} />
            <text x={sx(p.x)} y={sy(p.y) + 4} textAnchor="middle" className="map-point">
              {p.id}
            </text>
            <text x={sx(p.x)} y={sy(p.y) + 30} textAnchor="middle" className="map-label">
              {p.name} · {count} 段
            </text>
          </g>
        );
      })}

      <text x={M} y={H - 14} className="map-note">
        单位：m · 虚线为相邻点位间距
      </text>
    </svg>
  );
}
