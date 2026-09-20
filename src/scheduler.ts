import type { CeaseWindow, Conflict, FirePoint, Segment, ShiftResult } from "./types";

/** 秒 → "mm:ss.d" */
export function fmtTime(t: number): string {
  const sign = t < 0 ? "-" : "";
  const abs = Math.abs(t);
  const m = Math.floor(abs / 60);
  const s = abs - m * 60;
  return `${sign}${String(m).padStart(2, "0")}:${s.toFixed(1).padStart(4, "0")}`;
}

/** 带符号的秒数 → "+12.0s" / "-4.5s" */
export function fmtDelta(d: number): string {
  return `${d >= 0 ? "+" : "−"}${Math.abs(d).toFixed(1)}s`;
}

export function pointDistance(a: FirePoint, b: FirePoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * 段落改时后的整体顺延：
 * - 被修改的段落只改变时值，点火时间不动；
 * - 其后的段落整体平移 delta，直到（但不包括）下一个已勾选的定格段落；
 * - 定格段落本身永不移动。
 */
export function computeShift(segments: Segment[], segmentId: string, newDuration: number): ShiftResult {
  const idx = segments.findIndex((s) => s.id === segmentId);
  if (idx < 0) return { segments, movedIds: [], delta: 0 };
  const delta = newDuration - segments[idx].duration;
  const next = segments.map((s) => ({ ...s }));
  next[idx].duration = newDuration;
  const movedIds: string[] = [];
  if (delta !== 0) {
    for (let i = idx + 1; i < next.length; i++) {
      if (next[i].locked) break; // 定格段落是顺延的边界
      next[i].start += delta;
      movedIds.push(next[i].id);
    }
  }
  return { segments: next, movedIds, delta };
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/**
 * 对候选时间轴做整场校验，返回全部冲突（用于整体拒绝）。
 * - 点火 / 燃放时段落入停火窗
 * - 同一点位时段重叠（点位占用）
 * - 同时燃放的相邻点位安全距离不足（间距 < 双方安全距离之和）
 * - 段落结尾越过配乐终点
 * - 点火时间早于开场
 */
export function validateShow(
  segments: Segment[],
  points: FirePoint[],
  ceaseWindows: CeaseWindow[],
  musicEnd: number
): Conflict[] {
  const conflicts: Conflict[] = [];
  const pointOf = (id: string) => points.find((p) => p.id === id);

  for (const seg of segments) {
    const end = seg.start + seg.duration;
    if (seg.start < 0) {
      conflicts.push({
        type: "negative",
        segmentIds: [seg.id],
        message: `「${seg.name}」点火时间 ${fmtTime(seg.start)} 早于开场 00:00.0`,
      });
    }
    if (end > musicEnd) {
      conflicts.push({
        type: "music",
        segmentIds: [seg.id],
        message: `「${seg.name}」燃放到 ${fmtTime(end)}，越过配乐终点 ${fmtTime(musicEnd)}`,
      });
    }
    for (const w of ceaseWindows) {
      if (overlaps(seg.start, end, w.start, w.end)) {
        conflicts.push({
          type: "cease",
          segmentIds: [seg.id],
          message: `「${seg.name}」${fmtTime(seg.start)}–${fmtTime(end)} 落入停火窗 ${fmtTime(w.start)}–${fmtTime(w.end)}（${w.reason}）`,
        });
      }
    }
  }

  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      const a = segments[i];
      const b = segments[j];
      const aEnd = a.start + a.duration;
      const bEnd = b.start + b.duration;
      if (!overlaps(a.start, aEnd, b.start, bEnd)) continue;
      if (a.pointId === b.pointId) {
        conflicts.push({
          type: "overlap",
          segmentIds: [a.id, b.id],
          message: `「${a.name}」与「${b.name}」同时占用点位 ${a.pointId}（${fmtTime(Math.max(a.start, b.start))} 起重叠）`,
        });
        continue;
      }
      const pa = pointOf(a.pointId);
      const pb = pointOf(b.pointId);
      if (!pa || !pb) continue;
      const dist = pointDistance(pa, pb);
      const need = a.safety + b.safety;
      if (dist < need) {
        conflicts.push({
          type: "distance",
          segmentIds: [a.id, b.id],
          message: `「${a.name}」(${a.pointId}点) 与「${b.name}」(${b.pointId}点) 同时燃放：相邻间距 ${dist.toFixed(1)}m < 安全距离之和 ${need}m`,
        });
      }
    }
  }
  return conflicts;
}

/** 相邻点位的静态安全余量：间距 − 双方段落最大安全距离之和 */
export function linkClearance(
  a: FirePoint,
  b: FirePoint,
  segments: Segment[]
): { dist: number; need: number; clearance: number } {
  const dist = pointDistance(a, b);
  const maxSafety = (pid: string) =>
    segments.filter((s) => s.pointId === pid).reduce((m, s) => Math.max(m, s.safety), 0);
  const need = maxSafety(a.id) + maxSafety(b.id);
  return { dist, need, clearance: dist - need };
}
