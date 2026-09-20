import type { Segment } from "./types";

const KEY = "hxyfront-62008-schedule";

interface SavedSegment {
  id: string;
  start: number;
  duration: number;
  locked: boolean;
}

const num = (v: unknown, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

/** 读取浏览器中保存的成功编排；按 id 合并到默认数据上，容忍字段升级。 */
export function loadSegments(fallback: Segment[]): Segment[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;
    const saved = parsed.filter(
      (p): p is SavedSegment => !!p && typeof p === "object" && typeof (p as SavedSegment).id === "string"
    );
    return fallback.map((f) => {
      const hit = saved.find((p) => p.id === f.id);
      if (!hit) return { ...f };
      return {
        ...f,
        start: num(hit.start, f.start),
        duration: num(hit.duration, f.duration),
        locked: Boolean(hit.locked),
      };
    });
  } catch {
    return fallback;
  }
}

/** 仅在调整校验通过后调用，刷新页面后继续生效。 */
export function saveSegments(segments: Segment[]): void {
  try {
    const payload: SavedSegment[] = segments.map((s) => ({
      id: s.id,
      start: s.start,
      duration: s.duration,
      locked: s.locked,
    }));
    localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // 存储不可用时静默失败，不影响当前编排
  }
}

export function clearSaved(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
