/**
 * プラットフォームと外部ゲーム間の postMessage インターフェース
 */

export interface GamePlayer {
  userName: string;
  uuid: string; // sessionId
  isLocal: boolean; // このプレイヤーが操作者か
}

/** プラットフォーム → 外部ゲーム */
export interface GameStartMessage {
  type: "game_start";
  gameType: string;
  players: GamePlayer[];
}

/** 外部ゲーム → プラットフォーム */
export interface GameResultMessage {
  type: "game_result";
  winnerId: string | null; // null = draw
  scores?: Record<string, number>;
}

/** 外部ゲーム → プラットフォーム */
export interface GameCloseMessage {
  type: "game_close";
}

/** 全メッセージの Union 型 */
export type IframeMessage =
  | GameStartMessage
  | GameResultMessage
  | GameCloseMessage;

// Type guards

export function isGameStartMessage(data: unknown): data is GameStartMessage {
  if (typeof data !== "object" || data === null) return false;
  const msg = data as Record<string, unknown>;
  if (msg.type !== "game_start") return false;
  if (typeof msg.gameType !== "string") return false;
  if (!Array.isArray(msg.players)) return false;
  return msg.players.every((p: unknown) => {
    if (typeof p !== "object" || p === null) return false;
    const player = p as Record<string, unknown>;
    return (
      typeof player.userName === "string" &&
      typeof player.uuid === "string" &&
      typeof player.isLocal === "boolean"
    );
  });
}

export function isGameResultMessage(data: unknown): data is GameResultMessage {
  if (typeof data !== "object" || data === null) return false;
  const msg = data as Record<string, unknown>;
  if (msg.type !== "game_result") return false;
  if (msg.winnerId !== null && typeof msg.winnerId !== "string") return false;
  if (msg.scores !== undefined) {
    if (typeof msg.scores !== "object" || msg.scores === null) return false;
    for (const val of Object.values(msg.scores as Record<string, unknown>)) {
      if (typeof val !== "number") return false;
    }
  }
  return true;
}

export function isGameCloseMessage(data: unknown): data is GameCloseMessage {
  if (typeof data !== "object" || data === null) return false;
  const msg = data as Record<string, unknown>;
  return msg.type === "game_close";
}

export function isIframeMessage(data: unknown): data is IframeMessage {
  return (
    isGameStartMessage(data) ||
    isGameResultMessage(data) ||
    isGameCloseMessage(data)
  );
}
