import { randomUUID } from "crypto";
import {
  AvatarData,
  Position,
  BODY_COLORS,
  HEAD_SHAPES,
  ACCESSORIES,
  WORLD_WIDTH,
  WORLD_HEIGHT,
} from "@game-plaza/shared";

/**
 * セッション識別子を生成する
 */
export function generateUUID(): string {
  return randomUUID();
}

/**
 * 有効な選択肢からランダムなアバターを生成する
 */
export function generateRandomAvatar(): AvatarData {
  const bodyColor = BODY_COLORS[Math.floor(Math.random() * BODY_COLORS.length)];
  const headShape = HEAD_SHAPES[Math.floor(Math.random() * HEAD_SHAPES.length)];
  const accessory = ACCESSORIES[Math.floor(Math.random() * ACCESSORIES.length)];

  return { bodyColor, headShape, accessory };
}

/**
 * ワールド内のランダムな出現位置を生成する
 */
export function getRandomSpawnPosition(): Position {
  const x = Math.floor(Math.random() * (WORLD_WIDTH + 1));
  const y = Math.floor(Math.random() * (WORLD_HEIGHT + 1));

  return { x, y };
}

/**
 * 位置のバリデーション
 * position が有効な Position オブジェクトであることを検証する
 */
export function isValidPosition(position: unknown): position is Position {
  if (position === null || position === undefined || typeof position !== "object") {
    return false;
  }

  const pos = position as Record<string, unknown>;

  if (typeof pos.x !== "number" || typeof pos.y !== "number") {
    return false;
  }

  if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y)) {
    return false;
  }

  return pos.x >= 0 && pos.x <= WORLD_WIDTH && pos.y >= 0 && pos.y <= WORLD_HEIGHT;
}
