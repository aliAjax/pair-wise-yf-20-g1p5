import type { ShowState } from "./types";

/**
 * 初始整场脚本。
 * 时间单位统一为秒，点位平面坐标单位为米。
 * 初始状态保证无任何冲突：所有停火窗、相邻点位间距、配乐终点校验均通过。
 */
export const initialShow: ShowState = {
  musicEnd: 240, // 配乐终点 04:00.0
  savedAt: null,
  points: [
    { id: "A", name: "一号点位·西", x: 30, y: 40 },
    { id: "B", name: "二号点位·北", x: 90, y: 30 },
    { id: "C", name: "三号点位·东", x: 150, y: 45 },
    { id: "D", name: "四号点位·近景", x: 105, y: 95 },
  ],
  links: [
    ["A", "B"],
    ["B", "C"],
    ["C", "D"],
    ["B", "D"],
  ],
  ceaseWindows: [
    { id: "w1", start: 56, end: 66, reason: "低空无人机通场" },
    { id: "w2", start: 134, end: 146, reason: "消防复检停火" },
  ],
  segments: [
    { id: "s1", name: "Intro 开场扇形", model: "30mm扇形架", caliber: "30mm", angle: 60, pointId: "A", start: 12.5, duration: 18, safety: 25, shots: 24, locked: true },
    { id: "s2", name: "迎宾烛光", model: "罗马烛光", caliber: "20mm", angle: 75, pointId: "B", start: 34, duration: 20, safety: 20, shots: 36, locked: false },
    { id: "s3", name: "Chorus A 礼花齐鸣", model: "75mm礼花弹", caliber: "75mm", angle: 90, pointId: "B", start: 68.2, duration: 24, safety: 35, shots: 18, locked: false },
    { id: "s4", name: "银尾联动", model: "50mm礼花弹", caliber: "50mm", angle: 80, pointId: "C", start: 96, duration: 22, safety: 30, shots: 16, locked: false },
    { id: "s5", name: "中景冷焰", model: "冷焰火", caliber: "5mm", angle: 0, pointId: "D", start: 122, duration: 10, safety: 8, shots: 40, locked: false },
    { id: "s6", name: "高空礼花", model: "100mm礼花弹", caliber: "100mm", angle: 90, pointId: "C", start: 152, duration: 20, safety: 40, shots: 12, locked: false },
    { id: "s7", name: "尾声扇形", model: "30mm扇形架", caliber: "30mm", angle: 60, pointId: "A", start: 178, duration: 16, safety: 25, shots: 20, locked: false },
    { id: "s8", name: "Finale 终场齐射", model: "75mm礼花弹", caliber: "75mm", angle: 90, pointId: "B", start: 208, duration: 24, safety: 35, shots: 28, locked: true },
  ],
};
