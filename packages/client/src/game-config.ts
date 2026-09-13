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
      name: 'space-runnner',
      url: 'https://m-kotaro.github.io/otameshi-game-3/',
      origin: 'https://m-kotaro.github.io',
      metaUrl: 'https://m-kotaro.github.io/otameshi-game-3/meta.json',
    },
    {
      name: 'tegaki-votes',
      url: 'https://d39a3y4h958fl.cloudfront.net/',
      metaUrl: 'https://d39a3y4h958fl.cloudfront.net/meta.json',
    },
    {
      name: 'tegaki-votes-result',
      url: 'https://d39a3y4h958fl.cloudfront.net/results',
      metaUrl: 'https://d39a3y4h958fl.cloudfront.net/results-meta.json',
    },
    {
      name: 'toma-game',
      url: 'https://hibinomikata.github.io/testgame/',
      metaUrl: 'https://hibinomikata.github.io/testgame/meta.json',
    },
    // {
    //   name: 'shiritori',
    //   url: '/games/shiritori.html',
    //   metaUrl: '/games/shiritori-meta.json',
    // },
  ] as GameConfigEntry[],
  allowedOrigins: ['https://m-kotaro.github.io'] as string[],
  loadTimeoutMs: 10000,
};
