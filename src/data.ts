import type { CeasefireWindow, LaunchPoint, Segment, ShowState } from "./types";

export const DEFAULT_SEGMENTS: Segment[] = [
  { id: "intro", name: "Intro 开场扇形", product: "30mm扇形架", caliber: "30mm", angle: 45, start: 0, duration: 12500, pointId: "A", safety: 35, locked: false },
  { id: "verse", name: "Verse 冷焰走廊", product: "冷焰火", caliber: "20mm", angle: 90, start: 15000, duration: 20000, pointId: "C", safety: 15, locked: false },
  { id: "chorus-a", name: "Chorus A 礼花齐射", product: "75mm礼花弹", caliber: "75mm", angle: 60, start: 40000, duration: 18000, pointId: "B", safety: 45, locked: true },
  { id: "bridge", name: "Bridge 烛光梯队", product: "罗马烛光", caliber: "25mm", angle: 75, start: 62000, duration: 15000, pointId: "C", safety: 20, locked: false },
  { id: "interlude", name: "Interlude 扇形过渡", product: "30mm扇形架", caliber: "30mm", angle: 45, start: 80000, duration: 12000, pointId: "D", safety: 35, locked: false },
  { id: "finale", name: "Finale 百米礼花", product: "100mm礼花弹", caliber: "100mm", angle: 90, start: 95000, duration: 25000, pointId: "B", safety: 60, locked: true },
];

export const DEFAULT_POINTS: LaunchPoint[] = [
  { id: "A", name: "A 点位", x: 20, y: 25 },
  { id: "B", name: "B 点位", x: 85, y: 25 },
  { id: "C", name: "C 点位", x: 50, y: 60 },
  { id: "D", name: "D 点位", x: 105, y: 60 },
];

/** 相邻点位（平面图边界边） */
export const POINT_EDGES: Array<[string, string]> = [
  ["A", "B"],
  ["B", "D"],
  ["D", "C"],
  ["C", "A"],
];

export const DEFAULT_WINDOWS: CeasefireWindow[] = [
  { id: "w1", label: "播音联络停火窗", start: 70000, end: 75000 },
  { id: "w2", label: "无人机穿越停火窗", start: 110000, end: 118000 },
];

export const MUSIC_END = 150000;

export const DEFAULT_SHOW: ShowState = {
  segments: DEFAULT_SEGMENTS,
  points: DEFAULT_POINTS,
  windows: DEFAULT_WINDOWS,
  musicEnd: MUSIC_END,
};
