import gameConfigJson from '../../game-config.json';

/**
 * 外部ゲームの URL やゲームタイプを定義する設定
 */

export interface GameEntry {
  url: string;
  origin: string; // postMessage の targetOrigin
  label: string;
}

export interface GameIframeConfig {
  games: Record<string, GameEntry>; // key = gameType
  allowedOrigins: string[];
  loadTimeoutMs: number;
}

/**
 * game-config.json から設定を読み込み、ランタイム値（origin）を補完する
 */
function buildConfig(): GameIframeConfig {
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  const games: Record<string, GameEntry> = {};
  for (const [key, value] of Object.entries(gameConfigJson.games)) {
    const entry = value as { url: string; label?: string; origin?: string };
    games[key] = {
      url: entry.url,
      origin: entry.origin || currentOrigin,
      label: entry.label || key,
    };
  }

  const allowedOrigins =
    gameConfigJson.allowedOrigins.length > 0
      ? gameConfigJson.allowedOrigins
      : [currentOrigin];

  return {
    games,
    allowedOrigins,
    loadTimeoutMs: gameConfigJson.loadTimeoutMs || 10000,
  };
}

/** ゲーム設定（game-config.json ベース） */
export const DEFAULT_GAME_CONFIG: GameIframeConfig = buildConfig();

/**
 * ゲームタイプに対応するエントリを取得する
 * 存在しない場合は null を返す
 */
export function getGameEntry(
  config: GameIframeConfig,
  gameType: string,
): GameEntry | null {
  return config.games[gameType] ?? null;
}
