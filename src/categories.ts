/** 型号类别 → 展示色（沿用页面主色板） */
export const CATEGORY_COLORS: Record<string, string> = {
  礼花弹: "#dc2626",
  罗马烛光: "#f59e0b",
  扇形架: "#1d4ed8",
  冷焰火: "#0d9488",
  其他: "#64748b",
};

export const CATEGORY_ORDER = ["礼花弹", "罗马烛光", "扇形架", "冷焰火"];

export function categoryOf(model: string): string {
  for (const c of CATEGORY_ORDER) {
    if (model.includes(c)) return c;
  }
  return "其他";
}

export function colorOf(model: string): string {
  return CATEGORY_COLORS[categoryOf(model)] ?? CATEGORY_COLORS["其他"];
}
