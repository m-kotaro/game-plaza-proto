/**
 * ワールド定数
 */
export const WORLD_WIDTH = 1600; // ワールド幅 (px)
export const WORLD_HEIGHT = 1200; // ワールド高さ (px)
export const MAX_PLAYERS = 50;
export const HEARTBEAT_INTERVAL = 30_000; // クライアントの送信間隔 (30秒)
export const STALE_THRESHOLD = 60_000; // タイムアウト閾値 (60秒)
export const POSITION_SYNC_RATE = 100; // 位置送信間隔 (ms)

/**
 * アバター選択肢定数
 */
export const BODY_COLORS = [
  "red",
  "blue",
  "green",
  "yellow",
  "purple",
  "orange",
  "pink",
  "cyan",
] as const;

export const HEAD_SHAPES = [
  "round",
  "square",
  "triangle",
  "oval",
  "diamond",
] as const;

export const ACCESSORIES = [
  "none",
  "hat",
  "glasses",
  "ribbon",
  "crown",
  "headband",
] as const;

export type BodyColor = (typeof BODY_COLORS)[number];
export type HeadShape = (typeof HEAD_SHAPES)[number];
export type Accessory = (typeof ACCESSORIES)[number];
