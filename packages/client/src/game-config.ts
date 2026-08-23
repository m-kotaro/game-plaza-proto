/**
 * ゲーム設定ファイル
 * 各ゲームのURL、origin、メタ情報URLを定義する
 * コメントアウトでゲームを無効化できる
 */

export interface GameConfigEntry {
  name: string;
  url: string;
  origin?: string;
  metaUrl?: string;
}

export const gameConfig = {
  games: [
    {
      name: 'sample',
      url: 'https://m-kotaro.github.io/otameshi-game-sample/',
      origin: 'https://m-kotaro.github.io/otameshi-game-sample/',
      metaUrl: 'https://m-kotaro.github.io/otameshi-game-sample/meta.json',
    },
    {
      name: 'moguratataki',
      url: 'https://m-kotaro.github.io/otameshi-game/',
      origin: 'https://m-kotaro.github.io',
      metaUrl: 'https://m-kotaro.github.io/otameshi-game/meta.json',
    },
    {
      name: 'snake-game',
      url: 'https://m-kotaro.github.io/otameshi-game-2/',
      origin: 'https://m-kotaro.github.io',
      metaUrl: 'https://m-kotaro.github.io/otameshi-game-2/meta.json',
    },
    {
      name: 'snake-game',
      url: 'https://m-kotaro.github.io/otameshi-game-3/',
      origin: 'https://m-kotaro.github.io',
      metaUrl: 'https://m-kotaro.github.io/otameshi-game-3/meta.json',
    },
    // {
    //   name: 'memory',
    //   url: '/games/memory.html',
    //   metaUrl: '/games/memory-meta.json',
    // },
    // {
    //   name: 'slot',
    //   url: '/games/slot.html',
    //   metaUrl: '/games/slot-meta.json',
    // },
    // {
    //   name: 'dice',
    //   url: '/games/dice.html',
    //   metaUrl: '/games/dice-meta.json',
    // },
    // {
    //   name: 'shiritori',
    //   url: '/games/shiritori.html',
    //   metaUrl: '/games/shiritori-meta.json',
    // },
  ] as GameConfigEntry[],
  allowedOrigins: ['https://m-kotaro.github.io'] as string[],
  loadTimeoutMs: 10000,
};
