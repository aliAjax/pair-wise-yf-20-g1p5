import type { FirePoint, Segment } from "../types";
import { linkClearance } from "../scheduler";

interface Props {
  points: FirePoint[];
  links: [string, string][];
  segments: Segment[];
  hotPointIds: Set<string>; // 涉及冲突的点位
}

/** 燃放点位平面图：坐标单位米，虚线圆为该点位最大安全距离 */
export function PointMap({ points, links, segments, hotPointIds }: Props) {
  const byId = new Map(points.map((p) => [p.id, p]));
  const maxSafety = (pid: string) =>
    segments.filter((s) => s.pointId === pid).reduce((m, s) => Math.max(m, s.safety), 0);

  return (
    <svg className="pointmap" viewBox="-10 -14 220 150" role="img" aria-label="燃放点位平面图">
      {/* 相邻点位连线 + 间距 */}
      {links.map(([a, b]) => {
        const pa = byId.get(a);
        const pb = byId.get(b);
        if (!pa || !pb) return null;
        const { dist, clearance } = linkClearance(pa, pb, segments);
        const bad = clearance < 0;
        return (
          <g key={`${a}-${b}`}>
            <line x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} className={`pm-link${bad ? " bad" : ""}`} />
            <text x={(pa.x + pb.x) / 2} y={(pa.y + pb.y) / 2 - 3} className={`pm-dist${bad ? " bad" : ""}`} textAnchor="middle">
              {dist.toFixed(1)}m
            </text>
          </g>
        );
      })}

      {/* 点位 + 安全距离圈 */}
      {points.map((p) => {
        const hot = hotPointIds.has(p.id);
        return (
          <g key={p.id}>
            <circle cx={p.x} cy={p.y} r={maxSafety(p.id)} className="pm-safety" />
            <circle cx={p.x} cy={p.y} r={4.5} className={`pm-point${hot ? " hot" : ""}`} />
            <text x={p.x} y={p.y - 8} className="pm-label" textAnchor="middle">
              {p.id} {p.name.split("·")[1] ?? ""}
            </text>
            <text x={p.x} y={p.y + 13} className="pm-sub" textAnchor="middle">
              安全 {maxSafety(p.id)}m
            </text>
          </g>
        );
      })}
    </svg>
  );
}
