import type { Segment } from "../types";
import { colorOf } from "../categories";

interface Props {
  segments: Segment[];
}

/** 型号清单：按烟花型号汇总段落数、发数与安全距离 */
export function ModelList({ segments }: Props) {
  const groups = new Map<string, Segment[]>();
  for (const s of segments) {
    const list = groups.get(s.model) ?? [];
    list.push(s);
    groups.set(s.model, list);
  }

  return (
    <table className="model-table">
      <thead>
        <tr>
          <th>烟花型号</th>
          <th>口径</th>
          <th>段落</th>
          <th>总发数</th>
          <th>安全距离</th>
          <th>使用点位</th>
        </tr>
      </thead>
      <tbody>
        {[...groups.entries()].map(([model, list]) => (
          <tr key={model}>
            <td>
              <i className="dot" style={{ background: colorOf(model) }} />
              {model}
            </td>
            <td>{list[0].caliber}</td>
            <td>{list.length}</td>
            <td>{list.reduce((n, s) => n + s.shots, 0)}</td>
            <td>{Math.max(...list.map((s) => s.safety))}m</td>
            <td>{[...new Set(list.map((s) => s.pointId))].join(" / ")}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
