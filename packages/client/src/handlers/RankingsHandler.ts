import { ServerMessage, RankingEntry } from '@game-plaza/shared';
import { NetworkManager } from '../network';
import { Signboard } from '../scenes/Signboard';

/**
 * rankings_update メッセージを受信し、対応する Signboard を更新する
 */
export class RankingsHandler {
  private networkManager: NetworkManager;
  private signboards: Map<string, Signboard>;

  constructor(networkManager: NetworkManager, signboards: Map<string, Signboard>) {
    this.networkManager = networkManager;
    this.signboards = signboards;

    // Register message handler for rankings_update
    this.networkManager.onMessage((message: ServerMessage) => {
      if (message.type === 'rankings_update') {
        this.handleRankingsUpdate(message.gameType, message.rankings);
      }
    });
  }

  /** ランキング更新メッセージを処理 */
  private handleRankingsUpdate(gameType: string, rankings: RankingEntry[]): void {
    const signboard = this.signboards.get(gameType);
    if (signboard) {
      signboard.updateRankings(rankings);
    }
  }

  /** 全ゲームタイプのランキングを要求する */
  requestAllRankings(gameTypes: string[]): void {
    for (const gameType of gameTypes) {
      this.networkManager.send({ action: 'get_rankings', gameType });
    }
  }
}
