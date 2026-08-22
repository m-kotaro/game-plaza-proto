import type { ClientMessage, ServerMessage } from "./types";

/**
 * ClientMessage をJSON文字列にシリアライズする
 */
export function serializeClientMessage(message: ClientMessage): string {
  return JSON.stringify(message);
}

/**
 * JSON文字列を ClientMessage にデシリアライズする
 * 不正なデータの場合は null を返す
 */
export function deserializeClientMessage(data: string): ClientMessage | null {
  try {
    const parsed = JSON.parse(data);
    if (!isValidClientMessage(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * ServerMessage をJSON文字列にシリアライズする
 */
export function serializeServerMessage(message: ServerMessage): string {
  return JSON.stringify(message);
}

/**
 * JSON文字列を ServerMessage にデシリアライズする
 * 不正なデータの場合は null を返す
 */
export function deserializeServerMessage(data: string): ServerMessage | null {
  try {
    const parsed = JSON.parse(data);
    if (!isValidServerMessage(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * オブジェクトが有効な Position かどうかを検証する
 */
function isValidPosition(obj: unknown): boolean {
  if (typeof obj !== "object" || obj === null) return false;
  const pos = obj as Record<string, unknown>;
  return typeof pos.x === "number" && typeof pos.y === "number";
}

/**
 * オブジェクトが有効な AvatarData かどうかを検証する
 */
function isValidAvatarData(obj: unknown): boolean {
  if (typeof obj !== "object" || obj === null) return false;
  const avatar = obj as Record<string, unknown>;
  return (
    typeof avatar.bodyColor === "string" &&
    typeof avatar.headShape === "string" &&
    typeof avatar.accessory === "string"
  );
}

/**
 * パースされたオブジェクトが有効な ClientMessage かどうかを検証する
 */
function isValidClientMessage(obj: unknown): boolean {
  if (typeof obj !== "object" || obj === null) return false;
  const msg = obj as Record<string, unknown>;

  switch (msg.action) {
    case "init":
      return true;
    case "move":
      return isValidPosition(msg.position);
    case "customize_avatar":
      return isValidAvatarData(msg.avatarData);
    case "heartbeat":
      return true;
    default:
      return false;
  }
}

/**
 * パースされたオブジェクトが有効な ServerMessage かどうかを検証する
 */
function isValidServerMessage(obj: unknown): boolean {
  if (typeof obj !== "object" || obj === null) return false;
  const msg = obj as Record<string, unknown>;

  switch (msg.type) {
    case "world_state":
      return Array.isArray(msg.players) && msg.players.every(isValidPlayerInfo);
    case "player_joined":
      return (
        typeof msg.sessionId === "string" &&
        isValidAvatarData(msg.avatar) &&
        isValidPosition(msg.position)
      );
    case "player_left":
      return typeof msg.sessionId === "string";
    case "player_moved":
      return typeof msg.sessionId === "string" && isValidPosition(msg.position);
    case "avatar_updated":
      return typeof msg.sessionId === "string" && isValidAvatarData(msg.avatarData);
    default:
      return false;
  }
}

/**
 * オブジェクトが有効な PlayerInfo かどうかを検証する
 */
function isValidPlayerInfo(obj: unknown): boolean {
  if (typeof obj !== "object" || obj === null) return false;
  const player = obj as Record<string, unknown>;
  return (
    typeof player.sessionId === "string" &&
    isValidAvatarData(player.avatar) &&
    isValidPosition(player.position)
  );
}
