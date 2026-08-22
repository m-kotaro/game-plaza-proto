export interface GameMeta {
  title: string;
  description: string;
}

/**
 * 外部ゲームの meta.json を取得する
 * 取得失敗時はデフォルト値を返す
 */
export async function fetchGameMeta(metaUrl: string, fallbackTitle: string): Promise<GameMeta> {
  try {
    const response = await fetch(metaUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return {
      title: typeof data.title === 'string' ? data.title : fallbackTitle,
      description: typeof data.description === 'string' ? data.description : '',
    };
  } catch (error) {
    console.warn(`[GameMetaFetcher] Failed to fetch meta from ${metaUrl}:`, error);
    return { title: fallbackTitle, description: '' };
  }
}

/**
 * 全ゲームのメタ情報を一括取得する
 */
export async function fetchAllGameMeta(
  games: Record<string, { metaUrl: string }>
): Promise<Record<string, GameMeta>> {
  const entries = Object.entries(games);
  const results = await Promise.allSettled(
    entries.map(async ([key, game]) => {
      const meta = await fetchGameMeta(game.metaUrl, key);
      return [key, meta] as [string, GameMeta];
    })
  );

  const metaMap: Record<string, GameMeta> = {};
  for (const result of results) {
    if (result.status === 'fulfilled') {
      const [key, meta] = result.value;
      metaMap[key] = meta;
    }
  }
  return metaMap;
}
