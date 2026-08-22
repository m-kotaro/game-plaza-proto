import { gameConfig } from '../game-config';

/**
 * 外部ゲームの URL やゲームタイプを定義する設定
 */

export interface GameEntry {
  url: string;
  origin: string; // postMessage の targetOrigin
  metaUrl: string;
}

export interface GameIframeConfig {
  games: Record<string, GameEntry>; // key = gameType
  allowedOrigins: string[];
  loadTimeoutMs: number;
}

/**
 * game-config.ts から設定を読み込み、ランタイム値（origin）を補完する
 */
function buildConfig(): GameIframeConfig {
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  const games: Record<string, GameEntry> = {};
  for (const entry of gameConfig.games) {
    games[entry.name] = {
      url: entry.url,
      origin: entry.origin || currentOrigin,
      metaUrl: entry.metaUrl || `${entry.url.replace(/\/[^/]*$/, '/meta.json')}`,
    };
  }

  const allowedOrigins =
    gameConfig.allowedOrigins.length > 0
      ? gameConfig.allowedOrigins
      : [currentOrigin];

  return {
    games,
    allowedOrigins,
    loadTimeoutMs: gameConfig.loadTimeoutMs || 10000,
  };
}

/** ゲーム設定（game-config.ts ベース） */
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
