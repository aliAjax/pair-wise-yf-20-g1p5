import { initialShow } from "./data";
import type { ShowState } from "./types";

const KEY = "hxyfront-62008:show:v1";

/** 从浏览器恢复已保存的脚本；没有或损坏时回退到初始脚本 */
export function loadShow(): ShowState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(initialShow);
    const parsed = JSON.parse(raw) as ShowState;
    if (!Array.isArray(parsed.segments) || !Array.isArray(parsed.points)) {
      return structuredClone(initialShow);
    }
    return parsed;
  } catch {
    return structuredClone(initialShow);
  }
}

/** 成功调整后的整场状态持久化，刷新后继续 */
export function saveShow(show: ShowState): ShowState {
  const stamped = { ...show, savedAt: new Date().toISOString() };
  try {
    localStorage.setItem(KEY, JSON.stringify(stamped));
  } catch {
    // 存储不可用时仅保留内存状态
  }
  return stamped;
}

export function resetShow(): ShowState {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
  return structuredClone(initialShow);
}
