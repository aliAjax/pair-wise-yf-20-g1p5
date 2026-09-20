/** 节目段落：时间轴上的最小编排单元 */
export interface Segment {
  id: string;
  name: string; // 段落名
  model: string; // 烟花型号
  caliber: string; // 口径
  angle: number; // 发射角度
  pointId: string; // 燃放点位
  start: number; // 点火时间（秒）
  duration: number; // 持续时间 / 时值（秒）
  safety: number; // 安全距离（米）
  shots: number; // 发数
  locked: boolean; // 定格：勾选后点火时间不得移动，并阻断顺延传播
}

/** 燃放点位（平面图坐标，单位：米） */
export interface FirePoint {
  id: string;
  name: string;
  x: number;
  y: number;
}

/** 停火窗：禁止任何点火 / 燃放的时间段（秒） */
export interface CeaseWindow {
  id: string;
  start: number;
  end: number;
  reason: string;
}

/** 整场脚本状态（会整体持久化到浏览器） */
export interface ShowState {
  segments: Segment[];
  points: FirePoint[];
  links: [string, string][]; // 相邻点位对
  ceaseWindows: CeaseWindow[];
  musicEnd: number; // 配乐终点（秒）
  savedAt: string | null;
}

export type ConflictType = "cease" | "distance" | "overlap" | "music" | "negative";

export interface Conflict {
  type: ConflictType;
  message: string;
  segmentIds?: string[]; // 涉及段落，用于时间轴 / 点位图高亮
}

export interface ShiftResult {
  segments: Segment[];
  movedIds: string[];
  delta: number;
}

/** 一次调整的结果通告（成功已保存 / 整体拒绝） */
export interface AdjustNotice {
  ok: boolean;
  text: string;
  conflicts: Conflict[];
  at: string;
}
