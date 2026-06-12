export type VoiceColor =
  | "red"
  | "blue"
  | "yellow"
  | "green"
  | "purple"
  | "orange"
  | "black"
  | "white"
  | "gray";

export type ColorInfo = {
  key: VoiceColor;
  label: string;
  strokeColor: string;
  backgroundColor: string;
};

const COLORS: ColorInfo[] = [
  { key: "red", label: "红色", strokeColor: "#c92a2a", backgroundColor: "#ffe3e3" },
  { key: "blue", label: "蓝色", strokeColor: "#1864ab", backgroundColor: "#d0ebff" },
  { key: "yellow", label: "黄色", strokeColor: "#e67700", backgroundColor: "#fff3bf" },
  { key: "green", label: "绿色", strokeColor: "#2b8a3e", backgroundColor: "#d3f9d8" },
  { key: "purple", label: "紫色", strokeColor: "#7048e8", backgroundColor: "#e5dbff" },
  { key: "orange", label: "橙色", strokeColor: "#d9480f", backgroundColor: "#ffe8cc" },
  { key: "black", label: "黑色", strokeColor: "#1e1e1e", backgroundColor: "transparent" },
  { key: "white", label: "白色", strokeColor: "#495057", backgroundColor: "#ffffff" },
  { key: "gray", label: "灰色", strokeColor: "#495057", backgroundColor: "#e9ecef" },
];

const COLOR_ALIASES: Record<string, VoiceColor> = {
  红: "red",
  红色: "red",
  蓝: "blue",
  蓝色: "blue",
  黄: "yellow",
  黄色: "yellow",
  绿: "green",
  绿色: "green",
  紫: "purple",
  紫色: "purple",
  橙: "orange",
  橙色: "orange",
  黑: "black",
  黑色: "black",
  白: "white",
  白色: "white",
  灰: "gray",
  灰色: "gray",
};

export function findColor(input: string): ColorInfo | undefined {
  const alias = Object.keys(COLOR_ALIASES).find((word) => input.includes(word));
  if (!alias) {
    return undefined;
  }
  return getColorInfo(COLOR_ALIASES[alias]);
}

export function getColorInfo(color: VoiceColor): ColorInfo {
  return COLORS.find((item) => item.key === color) ?? COLORS[0];
}

export function getColorByBackground(backgroundColor?: string): ColorInfo | undefined {
  return COLORS.find((item) => item.backgroundColor === backgroundColor || item.strokeColor === backgroundColor);
}

export function colorLabel(color?: VoiceColor): string {
  return color ? getColorInfo(color).label : "";
}
