import Phaser from 'phaser';
import { RankingEntry } from '@game-plaza/shared';

export interface SignboardConfig {
  x: number;
  y: number;
  gameType: string;
  gameName: string;
  description: string;
}

/**
 * ワールド内の看板 — ゲーム名 + ランキング上位3名を常時表示
 * プレイヤーが近づくとゲーム説明ポップアップが表示される
 */
export class Signboard {
  private scene: Phaser.Scene;
  private config: SignboardConfig;
  private titleText: Phaser.GameObjects.Text;
  private rankingText: Phaser.GameObjects.Text;
  private popupText: Phaser.GameObjects.Text | null = null;
  private isPopupVisible = false;

  constructor(scene: Phaser.Scene, config: SignboardConfig) {
    this.scene = scene;
    this.config = config;

    // Title (game name)
    this.titleText = scene.add.text(config.x, config.y, config.gameName, {
      fontSize: '11px',
      color: '#ffd700',
      fontStyle: 'bold',
      align: 'center',
    });
    this.titleText.setOrigin(0.5);
    this.titleText.setDepth(2);

    // Ranking display (initially empty)
    this.rankingText = scene.add.text(config.x, config.y + 16, 'ランキング準備中...', {
      fontSize: '9px',
      color: '#cccccc',
      align: 'center',
      lineSpacing: 4,
    });
    this.rankingText.setOrigin(0.5, 0);
    this.rankingText.setDepth(2);
  }

  /** ランキングデータで看板を更新（上位3件表示） */
  updateRankings(rankings: RankingEntry[]): void {
    if (rankings.length === 0) {
      this.rankingText.setText('まだスコアがありません');
      return;
    }

    const lines = rankings.slice(0, 3).map((entry, i) =>
      `${i + 1}位: ${entry.playerName} ${entry.score}pts`
    );
    this.rankingText.setText(lines.join('\n'));
  }

  /** ゲーム説明ポップアップを表示 */
  showPopup(): void {
    if (this.isPopupVisible) return;
    this.isPopupVisible = true;

    this.popupText = this.scene.add.text(
      this.config.x,
      this.config.y - 40,
      this.config.description,
      {
        fontSize: '11px',
        color: '#ffffff',
        backgroundColor: '#000000cc',
        padding: { x: 8, y: 6 },
        align: 'center',
        wordWrap: { width: 180 },
      }
    );
    this.popupText.setOrigin(0.5);
    this.popupText.setDepth(100);
  }

  /** ゲーム説明ポップアップを非表示 */
  hidePopup(): void {
    if (!this.isPopupVisible) return;
    this.isPopupVisible = false;

    if (this.popupText) {
      this.popupText.destroy();
      this.popupText = null;
    }
  }

  /** タイトルと説明を外部から更新する */
  updateMeta(title: string, description: string): void {
    this.titleText.setText(title);
    this.config.gameName = title;
    this.config.description = description;
  }

  getGameType(): string {
    return this.config.gameType;
  }

  getPosition(): { x: number; y: number } {
    return { x: this.config.x, y: this.config.y };
  }
}
