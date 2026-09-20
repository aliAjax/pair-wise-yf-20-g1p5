import type { Conflict, Segment, ShowState } from "./types";

/** ms → "mm:ss.S" */
export function fmt(ms: number): string {
  const sign = ms < 0 ? "-" : "";
  const t = Math.abs(ms);
  const m = Math.floor(t / 60000);
  const s = Math.floor((t % 60000) / 1000);
  const tenth = Math.floor((t % 1000) / 100);
  return `${sign}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${tenth}`;
}

/**
 * 段落改时后的整体顺延：
 * 仅修改目标段落的时值，排在其后的段落按同一差值平移，
 * 遇到下一个定格段落即停止；定格段落自身永不移动。
 * 返回新数组，不改动入参。
 */
export function shiftForDurationChange(
  segments: Segment[],
  id: string,
  newDuration: number
): Segment[] {
  const idx = segments.findIndex((s) => s.id === id);
  if (idx < 0) return segments;
  const delta = newDuration - segments[idx].duration;
  if (delta === 0) return segments;

  let stop = segments.length; // 下一个定格段落的下标（不含）
  for (let i = idx + 1; i < segments.length; i++) {
    if (segments[i].locked) {
      stop = i;
      break;
    }
  }

  return segments.map((s, i) => {
    if (i === idx) return { ...s, duration: newDuration };
    if (i > idx && i < stop) return { ...s, start: s.start + delta };
    return s;
  });
}

/**
 * 校验整份时间轴，返回全部冲突：
 * 1. 点火时间落入停火窗；
 * 2. 燃放时段重叠的相邻点位安全距离之和不足；
 * 3. 段落结束越过配乐终点。
 */
export function validateShow(state: ShowState): Conflict[] {
  const conflicts: Conflict[] = [];
  const { segments, points, windows, musicEnd } = state;
  const pointById = new Map(points.map((p) => [p.id, p]));

  for (const s of segments) {
    const hit = windows.find((w) => s.start >= w.start && s.start < w.end);
    if (hit) {
      conflicts.push({
        type: "ceasefire",
        message: `「${s.name}」点火时间 ${fmt(s.start)} 落入停火窗「${hit.label}」(${fmt(hit.start)}–${fmt(hit.end)})`,
      });
    }
    if (s.start + s.duration > musicEnd) {
      conflicts.push({
        type: "musicEnd",
        message: `「${s.name}」结束于 ${fmt(s.start + s.duration)}，越过配乐终点 ${fmt(musicEnd)}`,
      });
    }
  }

  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      const a = segments[i];
      const b = segments[j];
      const overlap = a.start < b.start + b.duration && b.start < a.start + a.duration;
      if (!overlap) continue;
      const pa = pointById.get(a.pointId);
      const pb = pointById.get(b.pointId);
      if (!pa || !pb) continue;
      const dist = Math.hypot(pa.x - pb.x, pa.y - pb.y);
      const need = a.safety + b.safety;
      if (dist < need) {
        conflicts.push({
          type: "distance",
          message: `「${a.name}」与「${b.name}」燃放时段重叠，点位 ${pa.name}/${pb.name} 间距 ${dist.toFixed(1)}m 小于安全距离之和 ${need}m`,
        });
      }
    }
  }

  return conflicts;
}
