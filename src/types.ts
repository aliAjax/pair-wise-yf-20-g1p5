export interface Segment {
  id: string;
  name: string;
  product: string; // 烟花型号
  caliber: string; // 口径
  angle: number; // 发射角度
  start: number; // 点火时间 ms
  duration: number; // 持续时间 ms
  pointId: string; // 燃放点位
  safety: number; // 安全距离 m
  locked: boolean; // 定格：不得移动
}

export interface LaunchPoint {
  id: string;
  name: string;
  x: number; // 平面图坐标 m
  y: number;
}

export interface CeasefireWindow {
  id: string;
  label: string;
  start: number; // ms
  end: number; // ms
}

export type ConflictType = "ceasefire" | "distance" | "musicEnd";

export interface Conflict {
  type: ConflictType;
  message: string;
}

export interface ShowState {
  segments: Segment[];
  points: LaunchPoint[];
  windows: CeasefireWindow[];
  musicEnd: number; // 配乐终点 ms
}
